"use client";

import { readLocalConversationBindings } from "@/lib/db/client/data/chat/chat";
import {
  readLocalMedia,
  setLocalMediaDimensions,
} from "@/lib/db/client/data/media/media";
import { mediaBlobUrl } from "@/lib/db/client/data/media/blob-url";
import { readLocalCharacter } from "@/lib/db/client/data/rp/rp";
import { chatStore, convIdAtom } from "@/store/chat-store";
import { atom } from "jotai";

// RisuAI-style named character image assets: `{{img::name}}` resolves at DISPLAY
// time (markdown preprocess) to the image an author uploaded to the conversation's
// character(s), NOT via the macro engine. Mirrors inlay-render.ts; the only
// difference is the token is keyed by NAME, so the resolver maps a name to a
// media id through the conversation's bound characters' `assets` arrays. The CBS
// macro engine already strips `{{img::...}}` to "" at request build, so the token
// is author-emitted in the reply and only ever resolved here on render.

export const imgVersionAtom = atom(0);

// name-src cache keyed by `${convId}:${nameLower}`; a resolved-empty marker
// (src "") prevents re-resolving an unknown name every render.
type ResolvedAsset = {
  src: string;
  width: number | null;
  height: number | null;
};
const cache = new Map<string, ResolvedAsset>();
const pending = new Set<string>();

export const IMG_TOKEN_RE = /\{\{img::([^}]+?)\}\}/g;

function key(convId: string, nameLower: string): string {
  return `${convId}:${nameLower}`;
}

// Coalesced: a bump re-runs the full markdown pipeline for every message with an
// img token, and each resolved src is an inlined base64 data URI. A thread
// opening with N named assets resolves them in the same tick, so batch the
// bumps into one re-render instead of N. Mirrors inlay-render.ts.
let bumpScheduled = false;
function bump(): void {
  if (bumpScheduled) return;
  bumpScheduled = true;
  queueMicrotask(() => {
    bumpScheduled = false;
    chatStore.set(imgVersionAtom, chatStore.get(imgVersionAtom) + 1);
  });
}

async function resolveName(convId: string, nameLower: string): Promise<void> {
  const bindings = await readLocalConversationBindings(convId);
  const charIds = (bindings?.conversationCharacters ?? []).map(
    (c) => c.characterId,
  );
  const chars = await Promise.all(charIds.map((id) => readLocalCharacter(id)));
  // First bound character with a matching asset wins (group-chat friendly).
  let mediaId: string | undefined;
  for (const char of chars) {
    const hit = (char?.assets ?? []).find(
      (a) => a.name.trim().toLowerCase() === nameLower,
    );
    if (hit) {
      mediaId = hit.mediaId;
      break;
    }
  }
  if (!mediaId) {
    cache.set(key(convId, nameLower), { src: "", width: null, height: null });
    return;
  }
  const row = await readLocalMedia(mediaId);
  const k = key(convId, nameLower);
  const src = row?.dataBase64
    ? mediaBlobUrl(k, row.dataBase64, row.mimeType)
    : "";
  // The renderer reserves the asset's exact box from `@WxH` in the alt text, so
  // an image popping in mid-stream cannot grow the thread under the reader. Rows
  // without stored dimensions are measured here once (decode is off the render
  // path) and backfilled.
  let width = row?.width ?? null;
  let height = row?.height ?? null;
  if (src && row?.dataBase64 && (!width || !height)) {
    try {
      const blob = await (await fetch(src)).blob();
      const bmp = await createImageBitmap(blob);
      width = bmp.width;
      height = bmp.height;
      bmp.close();
      void setLocalMediaDimensions(mediaId, width, height).catch(() => {});
    } catch {
      width = null;
      height = null;
    }
  }
  cache.set(k, { src, width, height });
}

function requestImg(convId: string, nameLower: string): void {
  const k = key(convId, nameLower);
  if (cache.has(k) || pending.has(k)) return;
  pending.add(k);
  void resolveName(convId, nameLower)
    .then(bump)
    .finally(() => pending.delete(k));
}

export function replaceImgTokens(text: string): string {
  const convId = chatStore.get(convIdAtom);
  if (!convId) return text.replace(IMG_TOKEN_RE, "");
  return text.replace(IMG_TOKEN_RE, (_m, rawName: string) => {
    const name = rawName.trim();
    const nameLower = name.toLowerCase();
    const hit = cache.get(key(convId, nameLower));
    if (hit === undefined) {
      requestImg(convId, nameLower);
      return "";
    }
    if (!hit.src) return "";
    const size = hit.width && hit.height ? `@${hit.width}x${hit.height}` : "";
    return `![img:${name}${size}](${hit.src})`;
  });
}
