import { mediaKey, uploadToR2 } from "@/lib/config/r2";
import { uid } from "@/lib/utils/base";

export async function uploadMedia(file: File, convId: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${uid(8)}.${ext}`;
  const key = mediaKey(convId, uid(8), filename);
  const url = await uploadToR2(key, buffer, file.type);

  return { url, mimeType: file.type, sizeBytes: buffer.length };
}
