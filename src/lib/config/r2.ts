import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const R2_BUCKET = "unorouter-chat-media";

let _s3: S3Client | null = null;

function getS3() {
  if (_s3) return _s3;
  _s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return _s3;
}

function getPublicUrl() {
  return process.env.R2_PUBLIC_URL ?? "https://media.unorouter.ai";
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

export async function downloadAndUpload(
  url: string,
  convId: string,
  msgId: string,
): Promise<string> {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "video/mp4";
  const ext = contentType.split("/")[1] ?? "mp4";
  const filename = `${nanoid(8)}.${ext}`;
  const key = mediaKey(convId, msgId, filename);
  return uploadToR2(key, buffer, contentType);
}
