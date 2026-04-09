import { uid } from "@/lib/utils/base";
import { serverEnv } from "@/server/env";
import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import ipaddr from "ipaddr.js";

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const ALLOWED_RANGES = new Set(["unicast"]);
const R2_TIMEOUT = 15_000;
const DOWNLOAD_TIMEOUT = 10_000;

function validateExternalUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Blocked URL scheme: ${parsed.protocol}`);
  }
  if (BLOCKED_HOSTS.has(parsed.hostname)) {
    throw new Error("Blocked URL: reserved hostname");
  }
  if (ipaddr.isValid(parsed.hostname)) {
    const addr = ipaddr.parse(parsed.hostname);
    if (!ALLOWED_RANGES.has(addr.range())) {
      throw new Error("Blocked URL: private/reserved address");
    }
  }
}

const R2_BUCKET = "unorouter-chat-media";

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
    validateExternalUrl(url);
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT) });
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
  validateExternalUrl(url);
  const res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT) });
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type")!;
  const ext = contentType?.split("/")[1];
  const filename = `${uid(8)}.${ext}`;
  const key = mediaKey(convId, msgId, filename);
  return uploadToR2(key, buffer, contentType);
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
  let res: Response;
  try {
    validateExternalUrl(url);
    res = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT) });
    if (!res.ok) return null;
  } catch {
    return null;
  }
  const contentType = res.headers.get("content-type");
  if (isVideoContentType(contentType) !== wantVideo) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = contentType?.split("/")[1] ?? "bin";
  const key = mediaKey(convId, groupKey, `${uid(8)}.${ext}`);
  return uploadToR2(key, buffer, contentType ?? "application/octet-stream");
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
