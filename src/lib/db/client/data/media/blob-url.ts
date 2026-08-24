"use client";

import { base64ToUint8 } from "@/lib/utils/base";

// NEVER persist or export a blob: URL; it is dead after a reload. Store the media id.
const urls = new Map<string, string>();

export function mediaBlobUrl(
  key: string,
  base64: string,
  mimeType: string,
): string {
  const existing = urls.get(key);
  if (existing) return existing;
  const url = URL.createObjectURL(
    new Blob([base64ToUint8(base64)], { type: mimeType }),
  );
  urls.set(key, url);
  return url;
}

export function revokeMediaBlobUrl(key: string): void {
  const url = urls.get(key);
  if (!url) return;
  urls.delete(key);
  URL.revokeObjectURL(url);
}

export async function blobUrlToDataUri(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
