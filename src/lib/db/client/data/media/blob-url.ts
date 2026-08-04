"use client";

import { base64ToUint8 } from "@/lib/utils/base";

// A base64 `data:` URI for a multi-megabyte image is a multi-megabyte STRING:
// it lands in React state, rides through the markdown pipeline on every render,
// and the browser re-parses the base64 each time it paints. A blob: URL is ~40
// chars pointing at bytes the browser holds once, decoded once. Same <img src>
// contract, a fraction of the cost.
//
// Blob URLs are per-document and leak until revoked, so every URL is cached by
// a caller-owned key and revoked when that key is invalidated. NEVER persist or
// export one: it is meaningless in another document (and after a reload). The
// stored form stays the media id; blob URLs exist only for the live render.
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

export function revokeAllMediaBlobUrls(): void {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
}

// The inverse, for the few values that LEAVE the document: a blob: URL is meaningless to a
// server, so anything forwarded upstream (an init image, a reference) has to carry bytes.
export async function blobUrlToDataUri(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
