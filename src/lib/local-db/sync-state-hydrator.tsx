"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { PAGE_SIZE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type { SyncKindName } from "@/lib/validation/sync";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { getLocalDb } from "./client";
import { drainPending } from "./pending-sync";
import {
  readLocalCards,
  readLocalCharacters,
  readLocalConversations,
  readLocalGenerationSessions,
  readLocalLorebooks,
  readLocalPersonas,
  readLocalPresets,
} from "./reads";
import {
  upsertLocalCardBundle,
  upsertLocalCharacter,
  upsertLocalConversationBundle,
  upsertLocalGenerationSessionBundle,
  upsertLocalLorebookBundle,
  upsertLocalPersona,
  upsertLocalPreset,
  upsertLocalTheme,
} from "./writes";

// ---------------------------------------------------------------------------
// Three-stage non-blocking hydrator. Fires once after auth resolves.
//
// Stage 0 (SSR): handled by HydrationBoundary in the (chat) and (generate)
//   layouts - already in place.
// Stage 1: seed React Query cache from SQLocal so list pages render
//   immediately, including local-only rows.
// Stage 2: fetch /api/sync/state, diff against local DB, pull stale bundles,
//   null out local syncExpiresAt for rows the server no longer reports.
// Stage 3: drain `local_pending_sync` retry queue.
//
// Order doesn't matter: all writes go through qc.setQueryData per kind so
// React Query holds the latest version. Server-newer wins by updatedAt.
// ---------------------------------------------------------------------------

export function SyncStateHydrator() {
  const auth = useAuthQuery();
  const qc = useQueryClient();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!auth.data) return;
    fired.current = true;

    const userId = auth.data.id;
    console.log("[hydrator] firing for userId", userId);
    void hydrate(qc, userId).catch((err) => {
      console.error("[hydrator] failed", err);
      logger.warn("Sync hydration failed", {
        context: "local-db.hydrator",
        error: String(err),
      });
    });

    // Wire cross-tab reactive subscriptions. Each table mutation in any
    // tab fans into React Query via setQueryData so other tabs see the
    // change without a refetch.
    let unsubs: Array<() => void> = [];
    void wireReactive(qc, userId).then((fns) => {
      unsubs = fns;
    });
    return () => {
      for (const u of unsubs) u();
    };
  }, [auth.data, qc]);

  return null;
}

async function wireReactive(qc: QueryClient, userId: number) {
  const { subscribeReactive } = await import("./reactive");
  const unsubs: Array<() => void> = [];

  unsubs.push(
    await subscribeReactive("characters", userId, (rows) =>
      qc.setQueryData(queryKeys.characters(), rows),
    ),
  );
  unsubs.push(
    await subscribeReactive("personas", userId, (rows) =>
      qc.setQueryData(queryKeys.personas(), rows),
    ),
  );
  unsubs.push(
    await subscribeReactive("lorebooks", userId, (rows) =>
      qc.setQueryData(queryKeys.lorebooks(), rows),
    ),
  );
  unsubs.push(
    await subscribeReactive("presets", userId, (rows) =>
      qc.setQueryData(queryKeys.presets(), rows),
    ),
  );
  unsubs.push(
    await subscribeReactive("cards", userId, (rows) =>
      qc.setQueryData(queryKeys.cards(), rows),
    ),
  );
  unsubs.push(
    await subscribeReactive("conversations", userId, (rows) =>
      qc.setQueryData(queryKeys.conversations(undefined), rows),
    ),
  );
  unsubs.push(
    await subscribeReactive("generationSessions", userId, (rows) =>
      qc.setQueryData(queryKeys.generationSessionList(undefined), rows),
    ),
  );
  return unsubs;
}

async function hydrate(qc: QueryClient, userId: number) {
  const local = await getLocalDb(userId);
  if (!local) return;

  await stage1LocalSeed(qc, userId);
  await stage2ServerReconcile(qc, userId);
  await drainPending(userId);
}

async function stage1LocalSeed(qc: QueryClient, userId: number) {
  // SQLocal processor uses a single transactionMutex protected by a simple
  // promise mutex with a known race when multiple callers race to lock(). We
  // serialize the per-kind reads to avoid the deadlock until upstream fixes
  // sqlocal/dist/lib/create-mutex.js (PR pending).
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
  // Conversations + generation sessions are paginated server-side. Their
  // React Query caches expect specific shapes: useInfiniteQuery for convs
  // ({ pages, pageParams }) and useQuery returning { items: [...] } for
  // gen sessions. Seeding raw arrays crashes consumers (see [ConversationList]
  // crash with "Cannot read properties of undefined (reading 'length')").
  if (convs && convs.length > 0) {
    qc.setQueryData(queryKeys.conversations(undefined), {
      pages: [
        { items: convs, total: convs.length, page: 1, pageSize: PAGE_SIZE },
      ],
      pageParams: [1],
    });
  }
  if (genSessions && genSessions.length > 0) {
    qc.setQueryData(queryKeys.generationSessionList(undefined), {
      items: genSessions,
    });
  }
}

async function stage2ServerReconcile(qc: QueryClient, userId: number) {
  const state = handleElysia(await rpc.api.sync.state.get());
  qc.setQueryData(queryKeys.syncState(), state);

  // Serial per-kind reconcile - SQLocal's processor mutex deadlocks on
  // parallel callers; see stage1 note.
  await reconcileKind(userId, "characters", state.characters);
  await reconcileKind(userId, "personas", state.personas);
  await reconcileKind(userId, "lorebooks", state.lorebooks);
  await reconcileKind(userId, "presets", state.presets);
  await reconcileKind(userId, "cards", state.cards);
  await reconcileKind(userId, "conversations", state.conversations);
  await reconcileKind(userId, "generationSessions", state.generationSessions);
  await reconcileKind(userId, "theme", state.theme);
}

type RemoteState = {
  id: string;
  syncExpiresAt: string | Date | null;
  updatedAt: string | Date;
}[];

async function reconcileKind(
  userId: number,
  kind: SyncKindName,
  remote: RemoteState,
) {
  for (const remoteRow of remote) {
    const localRow = await readLocalById(userId, kind, remoteRow.id);
    const remoteUpdatedAt = new Date(remoteRow.updatedAt).getTime();
    const localUpdatedAt = localRow
      ? new Date((localRow as { updatedAt: Date }).updatedAt).getTime()
      : 0;
    if (remoteUpdatedAt <= localUpdatedAt && localRow) continue;
    try {
      const res = await rpc.api
        .sync({ kind })({ id: remoteRow.id })
        .bundle.get();
      const bundle = handleElysia(res) as Record<string, unknown>;
      await applyBundle(userId, kind, bundle);
    } catch (err) {
      logger.warn("Sync bundle pull failed", {
        context: "local-db.hydrator",
        kind,
        id: remoteRow.id,
        error: String(err),
      });
    }
  }
}

async function readLocalById(
  userId: number,
  kind: SyncKindName,
  id: string,
): Promise<unknown> {
  switch (kind) {
    case "characters":
      return (await readLocalCharacters(userId))?.find((r) => r.id === id);
    case "personas":
      return (await readLocalPersonas(userId))?.find((r) => r.id === id);
    case "lorebooks":
      return (await readLocalLorebooks(userId))?.find((r) => r.id === id);
    case "presets":
      return (await readLocalPresets(userId))?.find((r) => r.id === id);
    case "cards":
      return (await readLocalCards(userId))?.find((r) => r.id === id);
    case "conversations":
      return (await readLocalConversations(userId))?.find((r) => r.id === id);
    case "generationSessions":
      return (await readLocalGenerationSessions(userId))?.find(
        (r) => r.id === id,
      );
    case "theme":
      // theme is single-row; we always upsert.
      return null;
  }
}

async function applyBundle(
  userId: number,
  kind: SyncKindName,
  bundle: Record<string, unknown>,
) {
  switch (kind) {
    case "characters":
      await upsertLocalCharacter(userId, bundle.character as never);
      return;
    case "personas":
      await upsertLocalPersona(userId, bundle.persona as never);
      return;
    case "lorebooks":
      await upsertLocalLorebookBundle(userId, {
        lorebook: bundle.lorebook as never,
        entries: (bundle.entries as never[]) ?? [],
      });
      return;
    case "presets":
      await upsertLocalPreset(userId, bundle.preset as never);
      return;
    case "cards":
      await upsertLocalCardBundle(userId, {
        card: bundle.card as never,
        cardCharacters: (bundle.cardCharacters as never[]) ?? [],
        cardLorebooks: (bundle.cardLorebooks as never[]) ?? [],
      });
      return;
    case "conversations": {
      // Server-side conversation bundles carry media as pointers only (the
      // Turso row stores `r2_url` and never `data_base64`). Re-hydrate the
      // bytes back into base64 so the local row is fully self-contained -
      // chats keep working even if the R2 object is later expired/deleted.
      const rawMedia = (bundle.media as MediaRow[] | undefined) ?? [];
      const rehydratedMedia = await Promise.all(rawMedia.map(rehydrateMedia));
      await upsertLocalConversationBundle(userId, {
        conversation: bundle.conversation as never,
        settings: (bundle.settings as never) ?? null,
        conversationCharacters:
          (bundle.conversationCharacters as never[]) ?? [],
        conversationLorebooks: (bundle.conversationLorebooks as never[]) ?? [],
        messages: (bundle.messages as never[]) ?? [],
        messageItems: (bundle.messageItems as never[]) ?? [],
        media: rehydratedMedia as never[],
      });
      return;
    }
    case "generationSessions":
      await upsertLocalGenerationSessionBundle(userId, {
        session: bundle.session as never,
        generations: (bundle.generations as never[]) ?? [],
        generationImages: (bundle.generationImages as never[]) ?? [],
        generationLikes: (bundle.generationLikes as never[]) ?? [],
      });
      return;
    case "theme": {
      const themeRow = bundle.theme as
        | { themeJson: unknown; syncExpiresAt: Date | null }
        | undefined;
      if (!themeRow) return;
      await upsertLocalTheme(
        userId,
        themeRow.themeJson as never,
        themeRow.syncExpiresAt,
      );
      return;
    }
  }
}

type MediaRow = {
  id: string;
  convId: string | null;
  userId: number;
  mimeType: string;
  sizeBytes: number;
  r2Key: string | null;
  r2Url: string | null;
  dataBase64: string | null;
  extractedText: string | null;
  createdAt?: Date | string | number;
};

// If the server bundle hands us a pointer-only media row (r2_url set,
// data_base64 null), pull the binary back from R2 and stuff it into
// data_base64 so the local copy is independent of R2 lifetime. R2 failures
// are tolerated: we keep the pointer and surface a broken-media placeholder
// in the UI rather than aborting the whole bundle apply.
async function rehydrateMedia(row: MediaRow): Promise<MediaRow> {
  if (row.dataBase64 || !row.r2Url) return row;
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
    const base64 = arrayBufferToBase64(buf);
    return { ...row, dataBase64: base64 };
  } catch (err) {
    logger.warn("R2 media rehydrate failed", {
      context: "local-db.hydrator",
      id: row.id,
      error: String(err),
    });
    return row;
  }
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
