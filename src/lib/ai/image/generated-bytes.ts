import { markAiGenerated } from "@/lib/ai/image/ai-mark";
import { msg } from "@/lib/config/constants";
import { safeFetchBytes } from "@/lib/config/safe-fetch";
import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MEDIA_PREFIXES = ["video/", "image/", "audio/"];
const ALLOWED_DOCUMENT_MIMES = new Set(["application/pdf"]);

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

// The mime comes from the BYTES, never from the header or data: prefix: a
// backend declaring image/png for an html error page must fail here, not
// after the payload is persisted and rendered.
export async function downloadGenerationBytes(
  url: string,
): Promise<{ buffer: Buffer; mime: string; sizeBytes: number }> {
  const raw = url.startsWith("data:")
    ? Buffer.from(url.split(",")[1] ?? "", "base64")
    : (await safeFetchBytes(url)).buffer;
  const buffer = markAiGenerated(raw);
  const mime = await verifyMagicBytes(buffer);
  return { buffer, mime, sizeBytes: buffer.length };
}
