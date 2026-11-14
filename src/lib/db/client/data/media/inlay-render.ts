"use client";

import { chatStore } from "@/store/chat-store";
import { atom, type PrimitiveAtom } from "jotai";
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

export function rememberInlayDimensions(
  id: string,
  width: number,
  height: number,
): void {
  const hit = cache.get(id);
  if (!hit || !hit.src || (hit.width && hit.height)) return;
  cache.set(id, { ...hit, width, height });
}

// A bump re-runs the markdown pipeline for every message holding a token, so
// bumps within one tick collapse into one.
export function makeBump(version: PrimitiveAtom<number>): () => void {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      chatStore.set(version, (v) => v + 1);
    });
  };
}
const scheduleBump = makeBump(inlayVersionAtom);

type MediaDims = { width: number | null; height: number | null };

// The renderer reserves the box from `@WxH`, so missing dimensions are measured
// once and written back.
export async function measuredDims(
  mediaId: string,
  src: string,
  row: {
    dataBase64?: string | null;
    width?: number | null;
    height?: number | null;
  } | null,
): Promise<MediaDims> {
  const width = row?.width ?? null;
  const height = row?.height ?? null;
  if (!src || !row?.dataBase64 || (width && height)) return { width, height };
  try {
    const bmp = await createImageBitmap(await (await fetch(src)).blob());
    const dims = { width: bmp.width, height: bmp.height };
    bmp.close();
    void setLocalMediaDimensions(mediaId, dims.width, dims.height).catch(
      () => {},
    );
    return dims;
  } catch {
    return { width: null, height: null };
  }
}

export function tokenMarkdown(
  label: string,
  hit: { src: string } & MediaDims,
): string {
  if (!hit.src) return "";
  const size = hit.width && hit.height ? `@${hit.width}x${hit.height}` : "";
  return `![${label}${size}](${hit.src})`;
}

function requestInlay(id: string): void {
  if (cache.has(id) || pending.has(id)) return;
  pending.add(id);
  void readLocalMedia(id)
    .then(async (row) => {
      const src =
        (row?.dataBase64
          ? mediaBlobUrl(id, row.dataBase64, row.mimeType)
          : (row?.r2Url ?? null)) ?? "";
      cache.set(id, { src, ...(await measuredDims(id, src, row)) });
      scheduleBump();
    })
    .finally(() => pending.delete(id));
}

export function invalidateInlay(id: string): void {
  cache.delete(id);
  revokeMediaBlobUrl(id);
  chatStore.set(inlayVersionAtom, (v) => v + 1);
}

export function replaceInlayTokens(text: string): string {
  return text.replace(INLAY_TOKEN_RE, (_m, id: string) => {
    const hit = cache.get(id);
    if (hit === undefined) {
      requestInlay(id);
      return "";
    }
    return tokenMarkdown(`inlay:${id}`, hit);
  });
}
