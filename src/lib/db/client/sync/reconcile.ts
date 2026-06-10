"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import {
  SYNC_BUNDLE_CHUNK_SIZE,
  SYNC_KINDS,
  type SyncKindName,
} from "@/lib/validation/sync-constants";
import type { SyncBundle } from "@/server/ai/sync/bundles";
import type { QueryClient } from "@tanstack/react-query";
import { readLocalConversations } from "../data/chat";
import { readLocalGenerationSessions } from "../data/playground";
import { readLocalThemeRow } from "../data/theme";
import {
  readLocalCards,
  readLocalCharacters,
  readLocalLorebooks,
  readLocalPersonas,
  readLocalPresets,
} from "../data/rp";
import { applyBundle } from "./apply-bundle";

type RemoteState = {
  id: string;
  syncExpiresAt: string | Date | null;
  updatedAt: string | Date;
}[];

export type SkippedRow = { kind: SyncKindName; id: string };

// SYNC_KINDS order puts RP entities first so conversation FKs resolve when
// bundles reference freshly-pulled chars.
export function stage2ServerReconcile(
  qc: QueryClient,
  userId: number,
  excludeKinds: SyncKindName[] = [],
) {
  const skip = new Set(excludeKinds);
  return reconcileKinds(
    qc,
    userId,
    SYNC_KINDS.filter((k) => !skip.has(k)),
  );
}

// Pull the server sync state and reconcile the given kinds, serially (SQLocal
// mutex). Logs any rows skipped because the local copy was newer.
export async function reconcileKinds(
  qc: QueryClient,
  userId: number,
  kinds: readonly SyncKindName[],
): Promise<{ skippedLocalNewer: number; skippedRows: SkippedRow[] }> {
  const state = await qc.ensureQueryData({
    queryKey: queryKeys.syncState(),
    queryFn: async () => handleElysia(await rpc.api.ai.sync.state.get()),
  });
  let skippedLocalNewer = 0;
  const skippedRows: SkippedRow[] = [];
  for (const kind of kinds) {
    const r = await reconcileKind(userId, kind, state[kind]);
    skippedLocalNewer += r.skippedLocalNewer;
    skippedRows.push(...r.skippedRows);
  }
  if (skippedRows.length > 0) {
    logger.warn("Sync reconcile skipped local-newer rows", {
      context: "local-db.hydrator",
      count: skippedRows.length,
      skippedRows,
    });
  }
  return { skippedLocalNewer, skippedRows };
}

async function reconcileKind<K extends SyncKindName>(
  userId: number,
  kind: K,
  remote: RemoteState,
): Promise<{ skippedLocalNewer: number; skippedRows: SkippedRow[] }> {
  let skippedLocalNewer = 0;
  const skippedRows: SkippedRow[] = [];
  // Snapshot local updatedAt before network; one list read per kind (per-row
  // would re-scan the table remote.length times).
  const localById = new Map<string, number>(
    ((await LOCAL_LIST_READERS[kind]?.(userId)) ?? []).map((r) => [
      r.id,
      new Date(r.updatedAt).getTime(),
    ]),
  );
  const candidates = remote.map((remoteRow) => {
    const localUpdatedAt = localById.get(remoteRow.id);
    return {
      remoteRow,
      isStale:
        localUpdatedAt === undefined ||
        new Date(remoteRow.updatedAt).getTime() > localUpdatedAt,
    };
  });

  // Batch endpoint coalesces chunks; fallback per-row.
  const stale = candidates.filter((c) => c.isStale);
  for (let i = 0; i < stale.length; i += SYNC_BUNDLE_CHUNK_SIZE) {
    const chunk = stale.slice(i, i + SYNC_BUNDLE_CHUNK_SIZE);
    const bundles = await fetchBundleChunk(kind, chunk);
    for (let j = 0; j < bundles.length; j++) {
      const remoteRow = chunk[j].remoteRow;
      const entry = bundles[j];
      if (entry.error) {
        logger.warn("Sync bundle pull failed", {
          context: "local-db.hydrator",
          kind,
          id: remoteRow.id,
          error: entry.error,
        });
        continue;
      }
      try {
        const applied = await applyBundle(
          userId,
          kind,
          entry.bundle as SyncBundle<K>,
        );
        const skipped = applied?.skippedLocalNewer ?? 0;
        if (skipped > 0) {
          skippedLocalNewer += skipped;
          skippedRows.push({ kind, id: remoteRow.id });
        }
      } catch (err) {
        logger.warn("Sync bundle apply failed", {
          context: "local-db.hydrator",
          kind,
          id: remoteRow.id,
          error: String(err),
        });
      }
    }
  }
  return { skippedLocalNewer, skippedRows };
}

type FetchedBundle = { bundle?: unknown; error?: string };

async function fetchBundleChunk<K extends SyncKindName>(
  kind: K,
  chunk: Array<{ remoteRow: RemoteState[number] }>,
): Promise<FetchedBundle[]> {
  try {
    const res = await rpc.api.ai.sync.bundles.post({
      requests: chunk.map((c) => ({ kind, id: c.remoteRow.id })) as never,
    });
    const data = handleElysia(res) as Array<{
      kind: SyncKindName;
      id: string;
      bundle?: unknown;
      error?: string;
    }>;
    // Server preserves input ordering; map 1:1.
    return chunk.map((c, i) => {
      const entry = data[i];
      if (!entry) return { error: "missing batch response entry" };
      return entry.bundle != null
        ? { bundle: entry.bundle }
        : { error: entry.error ?? "unknown batch error" };
    });
  } catch (err) {
    // Batch endpoint failure (deploy skew, transient 5xx): fall back to
    // per-row so hydration still completes for users on the old server.
    logger.warn("Batch bundle endpoint failed, falling back to per-row", {
      context: "local-db.hydrator",
      kind,
      error: String(err),
    });
  }
  const results = await Promise.allSettled(
    chunk.map((c) =>
      rpc.api.ai.sync({ kind })({ id: c.remoteRow.id }).bundle.get(),
    ),
  );
  return results.map((res) => {
    if (res.status === "rejected") return { error: String(res.reason) };
    try {
      return { bundle: handleElysia(res.value) };
    } catch (err) {
      return { error: String(err) };
    }
  });
}

const LOCAL_LIST_READERS: Partial<
  Record<
    SyncKindName,
    (uid: number) => Promise<Array<{ id: string; updatedAt: Date }> | null>
  >
> = {
  characters: readLocalCharacters,
  personas: readLocalPersonas,
  lorebooks: readLocalLorebooks,
  presets: readLocalPresets,
  cards: readLocalCards,
  conversations: readLocalConversations,
  playgroundSessions: readLocalGenerationSessions,
  // Theme is keyed by userId (single row); without a reader it counted as
  // always-stale, re-pulling (and clobbering) the local theme every hydrate.
  theme: async (uid) => {
    const row = await readLocalThemeRow(uid);
    return row ? [{ id: String(uid), updatedAt: row.updatedAt }] : [];
  },
};
