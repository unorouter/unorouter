"use client";

import { chatStore } from "@/store/chat-store";
import { atom } from "jotai";
import {
  readLocalMedia,
  setLocalMediaDimensions,
} from "@/lib/db/client/data/media/media";
import {
  mediaBlobUrl,
  revokeMediaBlobUrl,
} from "@/lib/db/client/data/media/blob-url";

export const inlayVersionAtom = atom(0);

type InlayEntry = { src: string; width: number | null; height: number | null };

const cache = new Map<string, InlayEntry>();
const pending = new Set<string>();

const INLAY_TOKEN_RE = /\{\{inlay::([\w-]+)\}\}/g;

// The renderer measures a bitmap the first time it decodes and writes the size back
// here, so every later render of the same image reserves its box up front.
export function rememberInlayDimensions(
  id: string,
  width: number,
  height: number,
): void {
  const hit = cache.get(id);
  if (!hit || !hit.src || (hit.width && hit.height)) return;
  cache.set(id, { ...hit, width, height });
}

// Bumping the version atom re-runs the full markdown pipeline for every message
// holding an inlay token. A thread opening with N images resolves N rows in the
// same tick; coalesce the bumps into one so it costs a single re-render instead
// of N sequential ones.
let bumpScheduled = false;
function scheduleBump(): void {
  if (bumpScheduled) return;
  bumpScheduled = true;
  queueMicrotask(() => {
    bumpScheduled = false;
    chatStore.set(inlayVersionAtom, chatStore.get(inlayVersionAtom) + 1);
  });
}

export function requestInlay(id: string): void {
  if (cache.has(id) || pending.has(id)) return;
  pending.add(id);
  void readLocalMedia(id)
    .then(async (row) => {
      // A resolved-empty marker ("") for a missing/dataless row prevents
      // re-requesting an unknown inlay every render (each miss otherwise re-hit
      // OPFS synchronously, pinning the main thread).
      const src =
        (row?.dataBase64
          ? mediaBlobUrl(id, row.dataBase64, row.mimeType)
          : (row?.r2Url ?? null)) ?? "";
      let width = row?.width ?? null;
      let height = row?.height ?? null;
      // Measured here rather than from the img's onLoad so the alt token carries
      // `@WxH` on the FIRST render: a box reserved only after decode still grows
      // the thread under the reader once per unmeasured row.
      if (src && row?.dataBase64 && (!width || !height)) {
        try {
          const bmp = await createImageBitmap(await (await fetch(src)).blob());
          width = bmp.width;
          height = bmp.height;
          bmp.close();
          void setLocalMediaDimensions(id, width, height).catch(() => {});
        } catch {
          width = null;
          height = null;
        }
      }
      cache.set(id, { src, width, height });
      scheduleBump();
    })
    .finally(() => pending.delete(id));
}

export function invalidateInlay(id: string): void {
  cache.delete(id);
  revokeMediaBlobUrl(id);
  chatStore.set(inlayVersionAtom, chatStore.get(inlayVersionAtom) + 1);
}

export function replaceInlayTokens(text: string): string {
  return text.replace(INLAY_TOKEN_RE, (_m, id: string) => {
    const hit = cache.get(id);
    if (hit === undefined) {
      requestInlay(id);
      return "";
    }
    if (!hit.src) return "";
    const size = hit.width && hit.height ? `@${hit.width}x${hit.height}` : "";
    return `![inlay:${id}${size}](${hit.src})`;
  });
}
