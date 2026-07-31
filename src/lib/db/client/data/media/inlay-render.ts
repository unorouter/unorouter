"use client";

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

// Bumping the version atom re-runs the full markdown pipeline for every message
// holding an inlay token, and each resolved src is an inlined base64 data URI,
// so that re-parse is expensive. A thread opening with N images resolves N rows
// in the same tick; coalesce the bumps into one so it costs a single re-render
// instead of N sequential ones.
let bumpScheduled = false;
function scheduleBump(): void {
  if (bumpScheduled) return;
  bumpScheduled = true;
  queueMicrotask(() => {
    bumpScheduled = false;
    chatStore.set(inlayVersionAtom, chatStore.get(inlayVersionAtom) + 1);
  });
}

export function requestInlay(userId: number, id: string): void {
  if (cache.has(id) || pending.has(id)) return;
  pending.add(id);
  void readLocalMedia(userId, id)
    .then((row) => {
      // A resolved-empty marker ("") for a missing/dataless row prevents
      // re-requesting an unknown inlay every render (each miss otherwise re-hit
      // OPFS synchronously, pinning the main thread). Mirrors img-render.ts.
      const src =
        (row?.dataBase64
          ? `data:${row.mimeType};base64,${row.dataBase64}`
          : (row?.r2Url ?? null)) ?? "";
      cache.set(id, src);
      scheduleBump();
    })
    .finally(() => pending.delete(id));
}

export function invalidateInlay(id: string): void {
  cache.delete(id);
  chatStore.set(inlayVersionAtom, chatStore.get(inlayVersionAtom) + 1);
}

export function replaceInlayTokens(text: string, userId: number): string {
  return text.replace(INLAY_TOKEN_RE, (_m, id: string) => {
    const src = getInlaySrc(id);
    if (src === undefined) {
      requestInlay(userId, id);
      return "";
    }
    return src ? `![inlay:${id}](${src})` : "";
  });
}
