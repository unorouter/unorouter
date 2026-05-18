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

export async function readGenerationSnapshotFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

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
