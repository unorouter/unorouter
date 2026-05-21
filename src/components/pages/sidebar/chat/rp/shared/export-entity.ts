import { downloadBlob } from "@/lib/utils/client";

type EdenFileResponse = {
  response: Response;
  error: unknown;
};

// Shared tail of every RP entity export: unwrap the Eden file response, read
// the blob, honor the server's content-disposition filename, fall back to a
// caller-supplied name, and trigger the download. The caller owns the typed
// `rpc.api.ai.rp.<entity>(...).export.get(...)` call since each endpoint has
// its own Eden type.
export async function exportRpEntity(
  request: Promise<EdenFileResponse>,
  fallbackFilename: string,
): Promise<boolean> {
  const { response, error } = await request;
  if (error || !response.ok) return false;
  const blob = await response.blob();
  const filename =
    response.headers
      .get("content-disposition")
      ?.match(/filename="([^"]+)"/)?.[1] ?? fallbackFilename;
  downloadBlob(blob, filename);
  return true;
}
