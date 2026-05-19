import { downloadBlob, downloadJson } from "@/lib/utils/client";

export function downloadGenerationSnapshot(
  snapshot: unknown,
  filename: string,
): void {
  downloadJson(snapshot, filename);
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
  downloadBlob(blob, filename);
}
