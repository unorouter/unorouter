import { msg } from "@/lib/config/constants";
import { uid } from "@/lib/utils/base";
import { serverEnv } from "@/server/env";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import ipaddr from "ipaddr.js";
import { lookup as dnsLookup } from "node:dns";
import { Agent, fetch as undiciFetch, type Response as UndiciResponse } from "undici";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);
const ALLOWED_RANGES = new Set(["unicast"]);
const R2_TIMEOUT = 15_000;
const DOWNLOAD_TIMEOUT = 10_000;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_MEDIA_PREFIXES = ["video/", "image/", "audio/"];

function isPublicIp(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;
  return ALLOWED_RANGES.has(ipaddr.parse(ip).range());
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
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".internal")) {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  if (ipaddr.isValid(host) && !isPublicIp(host)) {
    throw new Error(msg("ERRORS.BLOCKED_URL"));
  }
  return parsed;
}

async function safeFetch(
  url: string,
  method: "GET" | "HEAD" = "GET",
): Promise<UndiciResponse> {
  parseAndCheckUrl(url);
  const res = await undiciFetch(url, {
    method,
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT),
    dispatcher: safeAgent,
    redirect: "manual",
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

function assertAllowedContentType(contentType: string | null): string {
  const ct = (contentType ?? "").toLowerCase().split(";")[0].trim();
  if (!ALLOWED_MEDIA_PREFIXES.some((p) => ct.startsWith(p))) {
    throw new Error(msg("ERRORS.DISALLOWED_CONTENT_TYPE"));
  }
  return ct;
}

function extFromContentType(ct: string): string {
  const sub = ct.split("/")[1] ?? "bin";
  return sub.replace(/[^a-z0-9]/gi, "") || "bin";
}

const R2_BUCKET = serverEnv.r2Bucket;

let _s3: S3Client | null = null;

function getS3() {
  if (_s3) return _s3;
  _s3 = new S3Client({
    region: "auto",
    endpoint: `https://${serverEnv.r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: serverEnv.r2AccessKeyId,
      secretAccessKey: serverEnv.r2SecretAccessKey,
    },
    requestHandler: { requestTimeout: R2_TIMEOUT },
  });
  return _s3;
}

function getPublicUrl() {
  return serverEnv.r2PublicUrl;
}

export async function pingR2(): Promise<boolean> {
  try {
    await getS3().send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
    return true;
  } catch {
    return false;
  }
}

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await getS3().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `${getPublicUrl()}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

export async function deleteR2Prefix(prefix: string): Promise<void> {
  const listed = await getS3().send(
    new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix }),
  );

  const objects = listed.Contents;
  if (!objects || objects.length === 0) return;

  await getS3().send(
    new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: objects.map((o) => ({ Key: o.Key! })) },
    }),
  );
}

export function mediaKey(
  convId: string,
  msgId: string,
  filename: string,
): string {
  return `chat/${convId}/${msgId}/${filename}`;
}

export async function getContentType(url: string): Promise<string | null> {
  try {
    const res = await safeFetch(url, "HEAD");
    return res.headers.get("content-type");
  } catch {
    return null;
  }
}

export function isVideoContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().startsWith("video/");
}

export async function downloadAndUpload(
  url: string,
  convId: string,
  msgId: string,
): Promise<string> {
  const res = await safeFetch(url);
  if (!res.ok) throw new Error(msg("ERRORS.UPSTREAM_FETCH_FAILED"));
  const ct = assertAllowedContentType(res.headers.get("content-type"));
  const buffer = await readBodyWithLimit(res);
  const filename = `${uid(8)}.${extFromContentType(ct)}`;
  const key = mediaKey(convId, msgId, filename);
  return uploadToR2(key, buffer, ct);
}

/**
 * Fetches a URL, checks content-type via the GET response headers,
 * and uploads to R2 only if the video/non-video type matches `wantVideo`.
 * Returns the R2 URL or null if the type doesn't match or fetch fails.
 */
export async function fetchCheckUpload(
  url: string,
  convId: string,
  groupKey: string,
  wantVideo: boolean,
): Promise<string | null> {
  let res: UndiciResponse;
  try {
    res = await safeFetch(url);
    if (!res.ok) return null;
  } catch {
    return null;
  }
  const contentType = res.headers.get("content-type");
  if (isVideoContentType(contentType) !== wantVideo) return null;
  let ct: string;
  try {
    ct = assertAllowedContentType(contentType);
  } catch {
    return null;
  }
  let buffer: Buffer;
  try {
    buffer = await readBodyWithLimit(res);
  } catch {
    return null;
  }
  const key = mediaKey(convId, groupKey, `${uid(8)}.${extFromContentType(ct)}`);
  return uploadToR2(key, buffer, ct);
}

export async function uploadBase64ToR2(
  dataUrl: string,
  convId: string,
  msgId: string,
): Promise<string> {
  const [header, base64] = dataUrl.split(",");
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
  const ext = mimeType.split("/")[1] ?? "png";
  const buffer = Buffer.from(base64, "base64");
  const filename = `${uid(8)}.${ext}`;
  const key = mediaKey(convId, msgId, filename);
  return uploadToR2(key, buffer, mimeType);
}
