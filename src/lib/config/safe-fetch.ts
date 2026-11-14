import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";

// Remote fetch for URLs a user or provider chooses. Private and reserved
// addresses are refused by the cluster network (CiliumClusterwideNetworkPolicy
// private-egress-deny in infra), whatever a name resolves to; this checks only
// what the network cannot know.

// Our own zones resolve to Cloudflare like any site, but a request from a node
// arrives at the gateway as trusted with the caller's address lost, which made
// custom-forward an anonymous relay into every host we run.
const OWN_DOMAINS = [
  ...new Set(
    [env.apiOrigin, env.siteOrigin].map((o) =>
      new URL(o).hostname.split(".").slice(-2).join("."),
    ),
  ),
];
const ALLOWED_PORTS = new Set([80, 443]);
const DOWNLOAD_TIMEOUT = 10_000;
// Busy hosts queue well past 30s before the first byte; Cloudflare's 100s origin read is the ceiling.
const STREAM_HEADERS_TIMEOUT = 90_000;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

function checkUrl(url: string): URL {
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
  if (!ALLOWED_PORTS.has(port)) throw new Error(msg("ERRORS.BLOCKED_URL"));
  // DNS and Cloudflare read "api.unorouter.com." as "api.unorouter.com".
  const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (OWN_DOMAINS.some((d) => host === d || host.endsWith("." + d))) {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  return parsed;
}

// A redirect would take the request to a target that was never checked.
function refuseRedirect(res: Response): Response {
  if (res.status >= 300 && res.status < 400) {
    void res.body?.cancel();
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  return res;
}

// Returns the live response for piping; only the wait for headers is bounded.
export async function safeFetchStream(
  url: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  } = {},
): Promise<Response> {
  checkUrl(url);
  const headers = new AbortController();
  const timer = setTimeout(() => headers.abort(), STREAM_HEADERS_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: opts.method ?? "GET",
      headers: opts.headers,
      body: opts.body,
      signal: opts.signal
        ? AbortSignal.any([opts.signal, headers.signal])
        : headers.signal,
      redirect: "manual",
    });
    return refuseRedirect(res);
  } finally {
    clearTimeout(timer);
  }
}

async function safeFetch(
  url: string,
  opts: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: string;
  } = {},
): Promise<{ res: Response; deadline: number }> {
  checkUrl(url);
  const deadline = Date.now() + DOWNLOAD_TIMEOUT;
  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: opts.headers,
    body: opts.body,
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT),
    redirect: "manual",
  });
  return { res: refuseRedirect(res), deadline };
}

// On Bun a read never settles once the abort fires after the headers arrived,
// so each read races the deadline the request started with.
async function readBefore(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  deadline: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(msg("ERRORS.UPSTREAM_FETCH_FAILED"))),
      Math.max(0, deadline - Date.now()),
    );
  });
  try {
    return await Promise.race([reader.read(), expired]);
  } catch (err) {
    reader.cancel().catch(() => {});
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function readBodyWithLimit(
  res: Response,
  maxBytes: number,
  deadline: number,
): Promise<Buffer> {
  const declared = Number(res.headers.get("content-length") ?? "0");
  if (declared && declared > maxBytes) {
    throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
  }
  const reader = res.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await readBefore(reader, deadline);
    if (next.done) break;
    total += next.value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => {});
      throw new Error(msg("ERRORS.RESPONSE_TOO_LARGE"));
    }
    chunks.push(next.value);
  }
  return Buffer.concat(chunks);
}

export async function safeFetchBytes(
  url: string,
  maxBytes = MAX_DOWNLOAD_BYTES,
): Promise<{ buffer: Buffer; contentType: string | null }> {
  const { res, deadline } = await safeFetch(url);
  if (!res.ok) throw new Error(msg("ERRORS.UPSTREAM_FETCH_FAILED"));
  return {
    buffer: await readBodyWithLimit(res, maxBytes, deadline),
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
  const { res, deadline } = await safeFetch(url, opts);
  return {
    buffer: await readBodyWithLimit(
      res,
      opts.maxBytes ?? MAX_DOWNLOAD_BYTES,
      deadline,
    ),
    contentType: res.headers.get("content-type"),
    status: res.status,
  };
}
