import { msg } from "@/lib/config/constants";
import { fileTypeFromBuffer } from "file-type";
import ipaddr from "ipaddr.js";
import { lookup as dnsLookup } from "node:dns";
import {
  Agent,
  fetch as undiciFetch,
  type Response as UndiciResponse,
} from "undici";

// SSRF-safe remote fetch toolkit (extracted from the former config/r2.ts). Used
// by character-card import, web-bot-auth directory fetch, model-tester verify,
// model verify-proxy, and image-gen reference-image fetch. No R2/S3 or DB deps.

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);
const DOWNLOAD_TIMEOUT = 10_000;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_MEDIA_PREFIXES = ["video/", "image/", "audio/"];
const ALLOWED_DOCUMENT_MIMES = new Set(["application/pdf"]);
const ALLOWED_PORTS = new Set([80, 443]);

const BLOCKED_IPV4_CIDRS: [ipaddr.IPv4, number][] = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16",
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "255.255.255.255/32",
].map((c) => ipaddr.IPv4.parseCIDR(c));

const BLOCKED_IPV6_CIDRS: [ipaddr.IPv6, number][] = [
  "::/128",
  "::1/128",
  "::ffff:0:0/96",
  "64:ff9b::/96",
  "100::/64",
  "2001::/23",
  "2001:db8::/32",
  "fc00::/7",
  "fe80::/10",
  "ff00::/8",
].map((c) => ipaddr.IPv6.parseCIDR(c));

function isPublicIp(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;
  const parsed = ipaddr.parse(ip);
  if (parsed instanceof ipaddr.IPv4) {
    for (const cidr of BLOCKED_IPV4_CIDRS) {
      if (parsed.match(cidr)) return false;
    }
    return true;
  }
  const v6 = parsed;
  if (v6.isIPv4MappedAddress()) {
    return isPublicIp(v6.toIPv4Address().toString());
  }
  for (const cidr of BLOCKED_IPV6_CIDRS) {
    if (v6.match(cidr)) return false;
  }
  return true;
}

const filteringLookup: typeof dnsLookup = ((
  hostname: string,
  options: unknown,
  callback: unknown,
) => {
  const cb = (typeof options === "function" ? options : callback) as (
    err: NodeJS.ErrnoException | null,
    address?: string | { address: string; family: number }[],
    family?: number,
  ) => void;
  const opts = (typeof options === "function" ? {} : options) as {
    all?: boolean;
    family?: number;
    hints?: number;
  };
  dnsLookup(hostname, { ...opts, all: true, verbatim: true }, (err, addrs) => {
    if (err) return cb(err);
    const list = Array.isArray(addrs) ? addrs : [];
    for (const a of list) {
      if (!isPublicIp(a.address)) {
        return cb(
          Object.assign(new Error(msg("ERRORS.BLOCKED_URL")), {
            code: "EBLOCKED",
          }),
        );
      }
    }
    if (opts.all) return cb(null, list);
    const first = list[0];
    if (!first) return cb(new Error(msg("ERRORS.BLOCKED_URL")));
    cb(null, first.address, first.family);
  });
}) as typeof dnsLookup;

const safeAgent = new Agent({
  connect: { lookup: filteringLookup },
  headersTimeout: DOWNLOAD_TIMEOUT,
  bodyTimeout: DOWNLOAD_TIMEOUT,
});

function parseAndCheckUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(msg("ERRORS.INVALID_URL"));
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  const port = parsed.port
    ? Number(parsed.port)
    : parsed.protocol === "https:"
      ? 443
      : 80;
  if (!ALLOWED_PORTS.has(port)) {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".internal")) {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  if (ipaddr.isValid(host) && !isPublicIp(host)) {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  return parsed;
}

// A separate agent for STREAMING responses (SSE): the download agent's 10s
// body timeout would kill any generation longer than that. Headers still time
// out, so a dead host cannot hold a connection open silently; the body flows
// as long as the model streams.
const safeStreamAgent = new Agent({
  connect: { lookup: filteringLookup },
  headersTimeout: 30_000,
  bodyTimeout: 0,
});

// SSRF-guarded fetch that returns the live response for piping (the custom
// provider proxy). Same URL/DNS/port policy as every other safe fetch here;
// redirects refused so the check cannot be bypassed by a hop.
export async function safeFetchStream(
  url: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  } = {},
): Promise<UndiciResponse> {
  parseAndCheckUrl(url);
  const res = await undiciFetch(url, {
    method: opts.method ?? "GET",
    headers: opts.headers,
    body: opts.body,
    signal: opts.signal,
    dispatcher: safeStreamAgent,
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  return res;
}

async function safeFetch(
  url: string,
  method: "GET" | "HEAD" = "GET",
  headers?: Record<string, string>,
): Promise<UndiciResponse> {
  parseAndCheckUrl(url);
  const res = await undiciFetch(url, {
    method,
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT),
    dispatcher: safeAgent,
    redirect: "manual",
    headers,
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  return res;
}

async function readBodyWithLimit(res: UndiciResponse): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared && declared > MAX_DOWNLOAD_BYTES) {
    throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
  }
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_DOWNLOAD_BYTES) {
      throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
    }
    return buf;
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    total += next.value.byteLength;
    if (total > MAX_DOWNLOAD_BYTES) {
      await reader.cancel();
      throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
    }
    chunks.push(next.value);
  }
  return Buffer.concat(chunks);
}

export async function safeFetchBytes(
  url: string,
  maxBytes: number,
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const res = await safeFetch(url);
  if (!res.ok) {
    throw new Error(msg("ERRORS.UPSTREAM_FETCH_FAILED"));
  }
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared && declared > maxBytes) {
    throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
  }
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes)
      throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
    return { buffer: buf, contentType: res.headers.get("content-type") };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    total += next.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
    }
    chunks.push(next.value);
  }
  return {
    buffer: Buffer.concat(chunks),
    contentType: res.headers.get("content-type"),
  };
}

export async function safeFetchRaw(
  url: string,
  opts: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
    maxBytes?: number;
  } = {},
): Promise<{ buffer: Buffer; contentType: string | null; status: number }> {
  const maxBytes = opts.maxBytes ?? MAX_DOWNLOAD_BYTES;
  parseAndCheckUrl(url);
  const res = await undiciFetch(url, {
    method: opts.method ?? "GET",
    headers: opts.headers,
    body: opts.body,
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT),
    dispatcher: safeAgent,
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  const buffer = await readBodyWithLimit(res);
  if (buffer.length > maxBytes) {
    throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
  }
  return {
    buffer,
    contentType: res.headers.get("content-type"),
    status: res.status,
  };
}

export async function verifyMagicBytes(
  body: Buffer | Uint8Array,
  declaredCt?: string,
): Promise<string> {
  const detected = await fileTypeFromBuffer(body);
  if (!detected) throw new Error(msg("ERRORS.DISALLOWED_CONTENT_TYPE"));
  const isMedia = ALLOWED_MEDIA_PREFIXES.some((p) =>
    detected.mime.startsWith(p),
  );
  const isDocument = ALLOWED_DOCUMENT_MIMES.has(detected.mime);
  if (!isMedia && !isDocument) {
    throw new Error(msg("ERRORS.DISALLOWED_CONTENT_TYPE"));
  }
  if (declaredCt && declaredCt !== detected.mime) {
    const sameCategory =
      isMedia && declaredCt.split("/")[0] === detected.mime.split("/")[0];
    if (!sameCategory) {
      throw new Error(msg("ERRORS.DISALLOWED_CONTENT_TYPE"));
    }
  }
  return detected.mime;
}

export async function downloadGenerationBytes(
  url: string,
  authToken?: string,
): Promise<{ buffer: Buffer; mime: string; sizeBytes: number }> {
  if (url.startsWith("data:")) {
    const [header, base64] = url.split(",");
    const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
    const buffer = Buffer.from(base64, "base64");
    return { buffer, mime, sizeBytes: buffer.length };
  }
  const headers = authToken
    ? { authorization: `Bearer ${authToken}` }
    : undefined;
  const res = await safeFetch(url, "GET", headers);
  if (!res.ok) throw new Error(msg("ERRORS.UPSTREAM_FETCH_FAILED"));
  const buffer = await readBodyWithLimit(res);
  return {
    buffer,
    mime: res.headers.get("content-type") ?? "image/png",
    sizeBytes: buffer.length,
  };
}
