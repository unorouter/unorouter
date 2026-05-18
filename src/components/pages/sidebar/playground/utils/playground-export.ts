// Helpers for the generation export/import flow. Kept separate from
// the React hook so the trigger logic isn't tangled with mutation state.

/** Wraps a snapshot in a Blob and fires the browser save dialog. */
export function downloadGenerationSnapshot(
  snapshot: unknown,
  filename: string,
): void {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Reads a File picked from <input type="file"> and parses it as JSON.
 *  Throws on parse failure; callers handle the toast. */
export async function readGenerationSnapshotFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

/** Downloads a single image to disk using the chat pattern: fetch the URL,
 *  blob it, click an anchor with download=filename. Works for R2 URLs and
 *  any cross-origin image that allows CORS. */
export async function downloadGenerationImage(
  url: string,
  filename: string,
): Promise<void> {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(blobUrl);
}
