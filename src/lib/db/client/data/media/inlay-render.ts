"use client";

// Render cache for {{inlay::<mediaId>}} tokens: media rows resolve to a data URI once, then preprocess swaps tokens. inlayVersionAtom bumps on load.

import { chatStore } from "@/store/chat-store";
import { atom } from "jotai";
import { readLocalMedia } from "@/lib/db/client/data/media/media";

export const inlayVersionAtom = atom(0);

const cache = new Map<string, string>();
const pending = new Set<string>();

export const INLAY_TOKEN_RE = /\{\{inlay::([\w-]+)\}\}/g;

export function getInlaySrc(id: string): string | undefined {
  return cache.get(id);
}

export function requestInlay(userId: number, id: string): void {
  if (cache.has(id) || pending.has(id)) return;
  pending.add(id);
  void readLocalMedia(userId, id)
    .then((row) => {
      if (!row) return;
      const src = row.dataBase64
        ? `data:${row.mimeType};base64,${row.dataBase64}`
        : (row.r2Url ?? null);
      if (!src) return;
      cache.set(id, src);
      chatStore.set(inlayVersionAtom, chatStore.get(inlayVersionAtom) + 1);
    })
    .finally(() => pending.delete(id));
}

// Regenerate replaced the media bytes in place: drop the cached src so the next render re-reads the row.
export function invalidateInlay(id: string): void {
  cache.delete(id);
  chatStore.set(inlayVersionAtom, chatStore.get(inlayVersionAtom) + 1);
}

// Sync swap for markdown preprocess; unresolved tokens disappear (load kicks off, the version bump
// re-renders). The alt text carries the media id so the image actions can open the prompt dialog.
export function replaceInlayTokens(text: string, userId: number): string {
  return text.replace(INLAY_TOKEN_RE, (_m, id: string) => {
    const src = getInlaySrc(id);
    if (src) return `![inlay:${id}](${src})`;
    requestInlay(userId, id);
    return "";
  });
}
