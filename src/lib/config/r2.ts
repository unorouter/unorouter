import { GUEST_USER_ID, msg, ParamError } from "@/lib/config/constants";
import { getDb } from "@/lib/db/server/client";
import { conversations, media } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { serverEnv } from "@/server/env";
import {
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { eq, sql } from "drizzle-orm";
import { fileTypeFromBuffer } from "file-type";
import ipaddr from "ipaddr.js";
import { lookup as dnsLookup } from "node:dns";
import {
  Agent,
  fetch as undiciFetch,
  type Response as UndiciResponse,
} from "undici";

const R2_BUCKET = serverEnv.r2Bucket;
const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.goog",
]);
const R2_TIMEOUT = 15_000;
const DOWNLOAD_TIMEOUT = 10_000;
const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;
const MAX_USER_BYTES = 100 * 1024 * 1024;
const ALLOWED_MEDIA_PREFIXES = ["video/", "image/", "audio/"];
const ALLOWED_DOCUMENT_MIMES = new Set(["application/pdf"]);
const ALLOWED_PORTS = new Set([80, 443]);

let _s3: S3Client | null = null;

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
].map((c) => ipaddr.parseCIDR(c) as [ipaddr.IPv4, number]);

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
].map((c) => ipaddr.parseCIDR(c) as [ipaddr.IPv6, number]);

function isPublicIp(ip: string): boolean {
  if (!ipaddr.isValid(ip)) return false;
  const parsed = ipaddr.parse(ip);
  if (parsed.kind() === "ipv4") {
    const v4 = parsed as ipaddr.IPv4;
    for (const cidr of BLOCKED_IPV4_CIDRS) {
      if (v4.match(cidr)) return false;
    }
    return true;
  }
  const v6 = parsed as ipaddr.IPv6;
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

// SSRF-safe remote fetch for caller-supplied URLs (playground reference
// images): runs the full allowlist (CIDR/DNS filter, redirect:manual, port +
// protocol checks) and caps bytes. Returns the body + detected content-type.
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

async function verifyMagicBytes(
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
    // Media: category match; documents: exact.
    const sameCategory =
      isMedia && declaredCt.split("/")[0] === detected.mime.split("/")[0];
    if (!sameCategory) {
      throw new Error(msg("ERRORS.DISALLOWED_CONTENT_TYPE"));
    }
  }
  return detected.mime;
}

function getS3() {
  if (_s3) return _s3;
  if (
    !serverEnv.r2AccountId ||
    !serverEnv.r2AccessKeyId ||
    !serverEnv.r2SecretAccessKey
  )
    throw new ParamError("ERRORS.MISSING_ENV", {
      var: "R2_ACCOUNT_ID/ACCESS_KEY/SECRET",
    });

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

export async function pingR2(): Promise<boolean> {
  try {
    await getS3().send(new HeadBucketCommand({ Bucket: R2_BUCKET }));
    return true;
  } catch {
    return false;
  }
}

// Hard ceiling on any single object written to R2. The download path caps via
// safeFetchBytes, but direct multipart uploads (playground references/masks)
// reach uploadToR2 without going through it, so the cap has to live here too
// or a large multipart POST sails straight past it.
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType?: string,
): Promise<{ url: string; mime: string }> {
  if (body.length > MAX_UPLOAD_BYTES) {
    throw new Error(msg("ERRORS.STORAGE_QUOTA_EXCEEDED"));
  }
  const mime = await verifyMagicBytes(body, contentType);
  await getS3().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: mime,
    }),
  );
  return { url: `${serverEnv.r2PublicUrl}/${key}`, mime };
}

export async function deleteR2Prefix(prefix: string): Promise<void> {
  // Both APIs cap at 1000 keys; loop until no continuation token.
  let continuationToken: string | undefined;
  do {
    const listed = await getS3().send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );
    const objects = listed.Contents;
    if (objects && objects.length > 0) {
      await getS3().send(
        new DeleteObjectsCommand({
          Bucket: R2_BUCKET,
          Delete: { Objects: objects.map((o) => ({ Key: o.Key! })) },
        }),
      );
    }
    continuationToken = listed.IsTruncated
      ? listed.NextContinuationToken
      : undefined;
  } while (continuationToken);
}

async function resolveConvOwner(
  convId: string,
): Promise<{ userId: number; isGuest: boolean; scope: "guest" | "user" }> {
  const rows = await getDb()
    .select({ userId: conversations.userId })
    .from(conversations)
    .where(eq(conversations.id, convId))
    .limit(1);
  const userId = rows[0]?.userId ?? GUEST_USER_ID;
  const isGuest = userId === GUEST_USER_ID;
  return { userId, isGuest, scope: isGuest ? "guest" : "user" };
}

export async function assertUserQuota(userId: number, incomingBytes: number) {
  if (userId === GUEST_USER_ID) return;
  const rows = await getDb()
    .select({ total: sql<number>`COALESCE(SUM(${media.sizeBytes}), 0)` })
    .from(media)
    .where(eq(media.userId, userId));
  const current = Number(rows[0]?.total ?? 0);
  if (current + incomingBytes > MAX_USER_BYTES) {
    throw new Error(msg("ERRORS.STORAGE_QUOTA_EXCEEDED"));
  }
}

export function mediaKey(
  scope: "guest" | "user",
  convId: string,
  msgId: string,
  filename: string,
): string {
  return `chat/${scope}/${convId}/${msgId}/${filename}`;
}

function isVideoContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  return contentType.toLowerCase().startsWith("video/");
}

async function putMedia(
  convId: string,
  msgId: string,
  buffer: Buffer,
  declaredCt?: string,
): Promise<string> {
  const owner = await resolveConvOwner(convId);
  await assertUserQuota(owner.userId, buffer.length);
  const key = mediaKey(owner.scope, convId, msgId, uid(8));
  const { url } = await uploadToR2(key, buffer, declaredCt);
  // Media rows live in client SQLocal only; the server never records a `media`
  // row here (R2 holds the bytes, the local DB holds the row).
  return url;
}

export async function downloadAndUpload(
  url: string,
  convId: string,
  msgId: string,
): Promise<string> {
  const res = await safeFetch(url);
  if (!res.ok) throw new Error(msg("ERRORS.UPSTREAM_FETCH_FAILED"));
  const buffer = await readBodyWithLimit(res);
  return putMedia(
    convId,
    msgId,
    buffer,
    res.headers.get("content-type") ?? undefined,
  );
}

export async function fetchCheckUpload(
  url: string,
  convId: string,
  groupKey: string,
  wantVideo: boolean,
): Promise<string | null> {
  try {
    const res = await safeFetch(url);
    if (!res.ok) return null;
    const header = res.headers.get("content-type");
    if (isVideoContentType(header) !== wantVideo) return null;
    const buffer = await readBodyWithLimit(res);
    return await putMedia(convId, groupKey, buffer, header ?? undefined);
  } catch {
    return null;
  }
}

export async function uploadBase64ToR2(
  dataUrl: string,
  convId: string,
  msgId: string,
): Promise<string> {
  const [header, base64] = dataUrl.split(",");
  const declaredCt = header.match(/data:([^;]+)/)?.[1];
  return putMedia(convId, msgId, Buffer.from(base64, "base64"), declaredCt);
}

// Playground media skips `media` table; refs under playgrounds-refs/.

function generationReferenceKey(userId: number, filename: string): string {
  return `playgrounds-refs/${userId}/${filename}`;
}

// Client-first: download bytes only, no R2 upload (the client persists them
// to local SQLocal as base64).
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

// Refs are scratch input images, never in the `media` table (so the quota
// SUM misses them) and the sweeper never prunes their prefix; a guest could
// write unbounded never-expiring objects. Cap per user: before each upload,
// drop the oldest beyond MAX_REF_OBJECTS so the prefix stays bounded.
const MAX_REF_OBJECTS = 20;

async function pruneRefObjects(userId: number): Promise<void> {
  const prefix = `playgrounds-refs/${userId}/`;
  const res = await getS3().send(
    new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: prefix }),
  );
  const objs = (res.Contents ?? []).filter((o) => o.Key);
  if (objs.length < MAX_REF_OBJECTS) return;
  const oldest = objs
    .sort(
      (a, b) =>
        (a.LastModified?.getTime() ?? 0) - (b.LastModified?.getTime() ?? 0),
    )
    .slice(0, objs.length - MAX_REF_OBJECTS + 1);
  await getS3().send(
    new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: oldest.map((o) => ({ Key: o.Key! })) },
    }),
  );
}

export async function uploadReferenceToR2(
  userId: number,
  body: Buffer | Uint8Array,
  declaredCt?: string,
): Promise<{ url: string; key: string; mime: string; sizeBytes: number }> {
  await pruneRefObjects(userId).catch(() => {});
  const key = generationReferenceKey(userId, uid(8));
  // uploadToR2 magic-byte verifies + restricts to the image/video/pdf
  // allowlist, so a non-image ref is rejected here.
  const { url, mime } = await uploadToR2(key, body, declaredCt);
  return { url, key, mime, sizeBytes: body.length };
}

export async function deleteGenerationObject(r2Key: string): Promise<void> {
  await getS3().send(
    new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: [{ Key: r2Key }] },
    }),
  );
}
