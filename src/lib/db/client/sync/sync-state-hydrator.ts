"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { GUEST_USER_ID, PAGE_SIZE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { arrayBufferToBase64, handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { media } from "@/lib/db/schema/shared";
import type { SyncBundle } from "@/server/ai/sync/bundles";
import {
  SYNC_BUNDLE_CHUNK_SIZE,
  SYNC_KINDS,
  type SyncKindName,
} from "@/lib/validation/sync";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";
import { getLocalDb } from "../client";
import {
  drainPending,
  retryPendingTargets,
  type DrainResult,
} from "./pending-sync";
import {
  readLocalCards,
  readLocalCharacter,
  readLocalCharacters,
  readLocalLorebook,
  readLocalLorebooks,
  readLocalPersona,
  readLocalPersonas,
  readLocalPreset,
  readLocalPresets,
  upsertLocalCardBundle,
  upsertLocalCharacter,
  upsertLocalLorebookBundle,
  upsertLocalPersona,
  upsertLocalPreset,
} from "../data/rp";
import {
  readLocalConversations,
  upsertLocalConversationBundle,
} from "../data/chat";
import { readLocalMedia } from "../data/media";
import {
  readLocalGenerationSessions,
  upsertLocalGenerationSessionBundle,
} from "../data/playground";
import { upsertLocalTheme } from "../data/theme";
import { usePendingDrainScheduler } from "./scheduler";

// Skip conv bundle pull on conv pages (SSR already covered); rest reconciles in idle callback.
const CONV_ROUTE_RE = /^\/[^/]+\/chat\/[^/]+\/?$/;

// Module-scoped fire-once gate shared across chat/playground layouts (avoid Stage 2 refire on nav).
// Tracks latest userId only so identity switch re-hydrates fresh.
let lastFiredUserId: number | null = null;

export function SyncStateHydrator() {
  const auth = useAuthQuery();
  const qc = useQueryClient();
  const t = useTranslations();
  const pathname = usePathname();

  usePendingDrainScheduler(auth.data?.id ?? null);

  useEffect(() => {
    const userId = auth.data?.id ?? GUEST_USER_ID;
    if (lastFiredUserId === userId) return;
    lastFiredUserId = userId;

    const onConvRoute = CONV_ROUTE_RE.test(pathname ?? "");
    const excludeKinds: SyncKindName[] = onConvRoute ? ["conversations"] : [];

    // Cast once at boundary: next-intl typed-key inference is too strict for
    // our runtime-keyed `t("SYNC.LOCAL_NEWER_PRESERVED", {count})` pattern.
    const tFn = t as unknown as TFn;
    void hydrate(qc, userId, tFn, excludeKinds)
      .catch((err) => {
        logger.warn("Sync hydration failed", {
          context: "local-db.hydrator",
          error: String(err),
        });
      })
      .then(() => {
        if (userId > GUEST_USER_ID && excludeKinds.length > 0) {
          scheduleCatchUp(qc, userId, tFn);
        }
      });
  }, [auth.data, qc, t, pathname]);

  return null;
}

function showLocalNewerToast(t: TFn, count: number) {
  if (count > 0) {
    toast.info(t("SYNC.LOCAL_NEWER_PRESERVED", { count }), { duration: 6000 });
  }
}

function scheduleCatchUp(qc: QueryClient, userId: number, t: TFn) {
  const runCatchUp = () => {
    void reconcileExcludedKinds(qc, userId, t, ["conversations"]).catch(
      (err) => {
        logger.warn("Sync catch-up failed", {
          context: "local-db.hydrator",
          error: String(err),
        });
      },
    );
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(runCatchUp, { timeout: 5000 });
  } else {
    setTimeout(runCatchUp, 5000);
  }
}

async function reconcileExcludedKinds(
  qc: QueryClient,
  userId: number,
  t: TFn,
  kinds: SyncKindName[],
) {
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
    logger.warn("Sync catch-up skipped local-newer rows", {
      context: "local-db.hydrator",
      count: skippedRows.length,
      skippedRows,
    });
  }
  showLocalNewerToast(t, skippedLocalNewer);
}

// Narrowed translator type: next-intl's `Translator` triggers TS2589 when the
// hydrator passes arbitrary string keys at runtime, so accept the minimal call shape.
type TFn = (key: string, values?: Record<string, string | number>) => string;

async function hydrate(
  qc: QueryClient,
  userId: number,
  t: TFn,
  excludeKinds: SyncKindName[] = [],
) {
  const local = await getLocalDb(userId);
  if (!local) return;

  await stage1LocalSeed(qc, userId);
  if (userId > GUEST_USER_ID) {
    const reconcile = await stage2ServerReconcile(qc, userId, excludeKinds);
    const result = await drainPending(userId);
    qc.invalidateQueries({ queryKey: queryKeys.pendingSync() });
    if (result.dead.length > 0) {
      surfaceDeadLetterToast(qc, userId, result, t);
    }
    showLocalNewerToast(t, reconcile.skippedLocalNewer);
  }
}

function surfaceDeadLetterToast(
  qc: QueryClient,
  userId: number,
  result: DrainResult,
  t: TFn,
) {
  const counts: Record<string, number> = {};
  for (const d of result.dead) counts[d.kind] = (counts[d.kind] ?? 0) + 1;
  const label = Object.entries(counts)
    .map(([kind, n]) => t("SYNC.DLQ_KIND_COUNT", { kind, count: n }))
    .join(", ");
  toast.error(t("SYNC.DLQ_TOAST", { items: label }), {
    duration: 10_000,
    action: {
      label: t("SYNC.DLQ_RETRY"),
      onClick: async () => {
        const retry = await retryPendingTargets(userId, qc, result.dead);
        if (retry.dead.length === 0) {
          toast.success(t("SYNC.DLQ_RETRY_SUCCESS"));
        } else {
          toast.error(t("SYNC.DLQ_RETRY_FAILED"));
        }
      },
    },
  });
}

async function stage1LocalSeed(qc: QueryClient, userId: number) {
  // Serial: SQLocal's processor mutex deadlocks on parallel callers
  // (sqlocal/dist/lib/create-mutex.js race, upstream PR pending).
  const chars = await readLocalCharacters(userId);
  const personas = await readLocalPersonas(userId);
  const lorebooks = await readLocalLorebooks(userId);
  const presets = await readLocalPresets(userId);
  const cards = await readLocalCards(userId);
  const convs = await readLocalConversations(userId);
  const genSessions = await readLocalGenerationSessions(userId);

  if (chars && chars.length > 0) qc.setQueryData(queryKeys.characters(), chars);
  if (personas && personas.length > 0)
    qc.setQueryData(queryKeys.personas(), personas);
  if (lorebooks && lorebooks.length > 0)
    qc.setQueryData(queryKeys.lorebooks(), lorebooks);
  if (presets && presets.length > 0)
    qc.setQueryData(queryKeys.presets(), presets);
  if (cards && cards.length > 0) qc.setQueryData(queryKeys.cards(), cards);
  // Cache shapes: convs use useInfiniteQuery {pages, pageParams}; gen sessions
  // use {items}. Seeding raw arrays crashes consumers.
  if (convs && convs.length > 0) {
    qc.setQueryData(queryKeys.conversations(undefined), {
      pages: [
        { items: convs, total: convs.length, page: 1, pageSize: PAGE_SIZE },
      ],
      pageParams: [1],
    });
  }
  if (genSessions && genSessions.length > 0) {
    qc.setQueryData(queryKeys.playgroundSessionList(undefined), {
      items: genSessions,
    });
  }
}

async function stage2ServerReconcile(
  qc: QueryClient,
  userId: number,
  excludeKinds: SyncKindName[] = [],
): Promise<{ skippedLocalNewer: number; skippedRows: SkippedRow[] }> {
  const state = await qc.ensureQueryData({
    queryKey: queryKeys.syncState(),
    queryFn: async () => handleElysia(await rpc.api.ai.sync.state.get()),
  });
  const skip = new Set(excludeKinds);
  let skippedLocalNewer = 0;
  const skippedRows: SkippedRow[] = [];
  // Serial (see stage1 mutex note). SYNC_KINDS order puts RP entities first
  // so conversation FKs resolve when bundles reference freshly-pulled chars.
  for (const kind of SYNC_KINDS) {
    if (skip.has(kind)) continue;
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

type RemoteState = {
  id: string;
  syncExpiresAt: string | Date | null;
  updatedAt: string | Date;
}[];

type SkippedRow = { kind: SyncKindName; id: string };

async function reconcileKind<K extends SyncKindName>(
  userId: number,
  kind: K,
  remote: RemoteState,
): Promise<{ skippedLocalNewer: number; skippedRows: SkippedRow[] }> {
  let skippedLocalNewer = 0;
  const skippedRows: SkippedRow[] = [];
  // Snapshot local updatedAt before network (mutex-safe, consistent staleness check).
  const candidates: Array<{
    remoteRow: RemoteState[number];
    isStale: boolean;
  }> = [];
  for (const remoteRow of remote) {
    const localRow = await readLocalById(userId, kind, remoteRow.id);
    const remoteUpdatedAt = new Date(remoteRow.updatedAt).getTime();
    const localUpdatedAt = localRow
      ? new Date(localRow.updatedAt).getTime()
      : 0;
    candidates.push({
      remoteRow,
      isStale: !localRow || remoteUpdatedAt > localUpdatedAt,
    });
  }

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

// Theme is keyed by userId (single row, no per-id list); skip lookup entirely.
const LOCAL_LIST_READERS: Partial<
  Record<SyncKindName, (uid: number) => Promise<Array<{ id: string; updatedAt: Date }> | null>>
> = {
  characters: readLocalCharacters,
  personas: readLocalPersonas,
  lorebooks: readLocalLorebooks,
  presets: readLocalPresets,
  cards: readLocalCards,
  conversations: readLocalConversations,
  playgroundSessions: readLocalGenerationSessions,
};

async function readLocalById(
  userId: number,
  kind: SyncKindName,
  id: string,
): Promise<{ updatedAt: Date } | null> {
  const reader = LOCAL_LIST_READERS[kind];
  if (!reader) return null;
  return (await reader(userId))?.find((r) => r.id === id) ?? null;
}

async function applyBundle<K extends SyncKindName>(
  userId: number,
  kind: K,
  bundle: SyncBundle<K>,
): Promise<{ skippedLocalNewer: number } | void> {
  switch (kind) {
    case "characters": {
      const b = bundle as SyncBundle<"characters">;
      await upsertLocalCharacter(userId, b.character);
      return;
    }
    case "personas": {
      const b = bundle as SyncBundle<"personas">;
      await upsertLocalPersona(userId, b.persona);
      return;
    }
    case "lorebooks": {
      const b = bundle as SyncBundle<"lorebooks">;
      await upsertLocalLorebookBundle(userId, {
        lorebook: b.lorebook,
        entries: b.entries,
      });
      return;
    }
    case "presets": {
      const b = bundle as SyncBundle<"presets">;
      await upsertLocalPreset(userId, b.preset);
      return;
    }
    case "cards": {
      const b = bundle as SyncBundle<"cards">;
      await upsertLocalCardBundle(userId, {
        card: b.card,
        cardCharacters: b.cardCharacters,
        cardLorebooks: b.cardLorebooks,
      });
      return;
    }
    case "conversations": {
      const b = bundle as SyncBundle<"conversations">;
      const rehydratedMedia = await rehydrateMediaBatch(userId, b.media);
      // Insert-only: skip when local exists so local edits aren't clobbered.
      for (const ch of b.characters ?? []) {
        const local = await readLocalCharacter(userId, ch.id);
        if (!local) await upsertLocalCharacter(userId, ch);
      }
      for (const p of b.personas ?? []) {
        const local = await readLocalPersona(userId, p.id);
        if (!local) await upsertLocalPersona(userId, p);
      }
      for (const pr of b.presets ?? []) {
        const local = await readLocalPreset(userId, pr.id);
        if (!local) await upsertLocalPreset(userId, pr);
      }
      for (const lb of b.lorebooks ?? []) {
        const local = await readLocalLorebook(userId, lb.lorebook.id);
        if (!local) {
          await upsertLocalLorebookBundle(userId, {
            lorebook: lb.lorebook,
            entries: lb.entries,
          });
        }
      }
      return upsertLocalConversationBundle(userId, {
        conversation: b.conversation,
        settings: b.settings,
        conversationCharacters: b.conversationCharacters,
        conversationLorebooks: b.conversationLorebooks,
        messages: b.messages,
        messageItems: b.messageItems,
        media: rehydratedMedia,
        requestLogs: b.requestLogs,
      });
    }
    case "playgroundSessions": {
      const b = bundle as SyncBundle<"playgroundSessions">;
      const rehydratedMedia = await rehydrateMediaBatch(userId, b.media);
      await upsertLocalGenerationSessionBundle(userId, {
        session: b.session,
        playgrounds: b.playgrounds,
        media: rehydratedMedia,
      });
      return;
    }
    case "theme": {
      const b = bundle as SyncBundle<"theme">;
      await upsertLocalTheme(userId, b.theme.themeJson, b.theme.syncExpiresAt);
      return;
    }
  }
}

type MediaRow = typeof media.$inferSelect;

const REHYDRATE_CONCURRENCY = 6;

async function rehydrateMediaBatch(
  userId: number,
  rows: MediaRow[],
): Promise<MediaRow[]> {
  const out = new Array<MediaRow>(rows.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: REHYDRATE_CONCURRENCY }, async () => {
      while (cursor < rows.length) {
        const i = cursor++;
        out[i] = await rehydrateMedia(userId, rows[i]);
      }
    }),
  );
  return out;
}

// Asymmetric base64 rule (see media schema): server pulls carry dataBase64=null.
// Never overwrite present local cache (transient R2 failure preserves bytes).
// Fetch R2 only on first sight.
async function rehydrateMedia(
  userId: number,
  row: MediaRow,
): Promise<MediaRow> {
  if (row.dataBase64) return row;
  const existing = await readLocalMedia(userId, row.id);
  const fallbackBase64 = existing?.dataBase64 ?? null;
  if (!row.r2Url) {
    return fallbackBase64 ? { ...row, dataBase64: fallbackBase64 } : row;
  }
  if (fallbackBase64) {
    return { ...row, dataBase64: fallbackBase64 };
  }
  try {
    const res = await fetch(row.r2Url);
    if (!res.ok) {
      logger.warn("R2 media fetch failed", {
        context: "local-db.hydrator",
        id: row.id,
        status: res.status,
      });
      return row;
    }
    const buf = await res.arrayBuffer();
    return { ...row, dataBase64: arrayBufferToBase64(buf) };
  } catch (err) {
    logger.warn("R2 media rehydrate failed", {
      context: "local-db.hydrator",
      id: row.id,
      error: String(err),
    });
    return row;
  }
}
