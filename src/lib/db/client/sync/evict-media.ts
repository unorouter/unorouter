"use client";

import {
  characters,
  lorebooks,
  personas,
  samplingPresets,
} from "@/lib/db/schema/shared";
import { and, eq, isNull } from "drizzle-orm";
import { getLocalDb } from "../client";
import { upsertLocalMedia } from "../data/media";

type MediaRowLike = {
  id: string;
  convId?: string | null;
  mimeType: string;
  sizeBytes: number;
  dataBase64?: string | null;
  r2Key?: string | null;
  r2Url?: string | null;
  extractedText?: string | null;
};

type BundleLike = {
  media?: MediaRowLike[];
};

// Drop local base64 once the server stamped r2Key/r2Url; without eviction the
// client doubles OPFS footprint and re-uploads on every push.
export async function evictMediaBase64After(
  userId: number,
  result: unknown,
): Promise<void> {
  if (!result || typeof result !== "object") return;
  const bundle = result as BundleLike;
  const media = bundle.media;
  if (!Array.isArray(media) || media.length === 0) return;
  for (const row of media) {
    if (!row || !row.r2Key || !row.r2Url) continue;
    await upsertLocalMedia(userId, { ...row, dataBase64: null });
  }
}

type RefRowLike = { id?: string; syncExpiresAt?: string | Date | null };
type RefBundleLike = {
  characters?: RefRowLike[];
  personas?: RefRowLike[];
  presets?: RefRowLike[];
  lorebooks?: Array<{ lorebook?: RefRowLike }>;
};

// A full conversation push inlines local-only referenced entities; the server
// creates synced rows for them (with the conv's expiry) but the origin's local
// copies keep syncExpiresAt=null, so later local edits never mirror and the
// server copy silently goes stale. Adopt the server-assigned expiry locally
// (column-scoped, only where still null) to open the mirror gate.
export async function adoptRefSyncExpiry(
  userId: number,
  result: unknown,
): Promise<void> {
  if (!result || typeof result !== "object") return;
  const local = await getLocalDb(userId);
  if (!local) return;
  const bundle = result as RefBundleLike;
  const targets: Array<
    [
      (
        | typeof characters
        | typeof personas
        | typeof samplingPresets
        | typeof lorebooks
      ),
      RefRowLike[],
    ]
  > = [
    [characters, bundle.characters ?? []],
    [personas, bundle.personas ?? []],
    [samplingPresets, bundle.presets ?? []],
    [lorebooks, (bundle.lorebooks ?? []).map((l) => l.lorebook ?? {})],
  ];
  for (const [table, rows] of targets) {
    for (const row of rows) {
      if (!row.id || row.syncExpiresAt == null) continue;
      await local.db
        .update(table)
        .set({ syncExpiresAt: new Date(row.syncExpiresAt) })
        .where(and(eq(table.id, row.id), isNull(table.syncExpiresAt)));
    }
  }
}
