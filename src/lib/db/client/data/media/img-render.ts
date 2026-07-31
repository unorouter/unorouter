"use client";

import { readLocalConversationBindings } from "@/lib/db/client/data/chat/chat";
import { readLocalMedia } from "@/lib/db/client/data/media/media";
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

// name-src cache keyed by `${convId}:${nameLower}`; a resolved-empty marker ("")
// prevents re-resolving an unknown name every render.
const cache = new Map<string, string>();
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

async function resolveName(
  userId: number,
  convId: string,
  nameLower: string,
): Promise<void> {
  const bindings = await readLocalConversationBindings(userId, convId);
  const charIds = (bindings?.conversationCharacters ?? []).map(
    (c) => c.characterId,
  );
  const chars = await Promise.all(
    charIds.map((id) => readLocalCharacter(userId, id)),
  );
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
    cache.set(key(convId, nameLower), "");
    return;
  }
  const row = await readLocalMedia(userId, mediaId);
  const src = row?.dataBase64
    ? `data:${row.mimeType};base64,${row.dataBase64}`
    : "";
  cache.set(key(convId, nameLower), src);
}

function requestImg(userId: number, convId: string, nameLower: string): void {
  const k = key(convId, nameLower);
  if (cache.has(k) || pending.has(k)) return;
  pending.add(k);
  void resolveName(userId, convId, nameLower)
    .then(bump)
    .finally(() => pending.delete(k));
}

// Drop every cached entry for a character's assets (e.g. after an asset edit),
// forcing the next render to re-resolve names to fresh media.
export function invalidateImgAssets(): void {
  cache.clear();
  bump();
}

export function replaceImgTokens(text: string, userId: number): string {
  const convId = chatStore.get(convIdAtom);
  if (!convId) return text.replace(IMG_TOKEN_RE, "");
  return text.replace(IMG_TOKEN_RE, (_m, rawName: string) => {
    const name = rawName.trim();
    const nameLower = name.toLowerCase();
    const src = cache.get(key(convId, nameLower));
    if (src === undefined) {
      requestImg(userId, convId, nameLower);
      return "";
    }
    return src ? `![img:${name}](${src})` : "";
  });
}
