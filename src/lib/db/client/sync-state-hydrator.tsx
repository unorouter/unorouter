"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { PAGE_SIZE } from "@/lib/config/constants";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { media } from "@/lib/db/schema/shared";
import type { SyncBundle, SyncKind } from "@/server/chat/sync.service";
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

export function SyncStateHydrator() {
  const auth = useAuthQuery();
  const qc = useQueryClient();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const userId = auth.data?.id ?? 0;
    void hydrate(qc, userId).catch((err) => {
      logger.warn("Sync hydration failed", {
        context: "local-db.hydrator",
        error: String(err),
      });
    });
  }, [auth.data, qc]);

  return null;
}

async function hydrate(qc: QueryClient, userId: number) {
  const local = await getLocalDb(userId);
  if (!local) return;

  await stage1LocalSeed(qc, userId);
  if (userId > 0) {
    await stage2ServerReconcile(qc, userId);
    await drainPending(userId);
  }
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

async function stage2ServerReconcile(qc: QueryClient, userId: number) {
  const state = handleElysia(await rpc.api.sync.state.get());
  qc.setQueryData(queryKeys.syncState(), state);

  // Serial (see stage1 mutex note).
  await reconcileKind(userId, "characters", state.characters);
  await reconcileKind(userId, "personas", state.personas);
  await reconcileKind(userId, "lorebooks", state.lorebooks);
  await reconcileKind(userId, "presets", state.presets);
  await reconcileKind(userId, "cards", state.cards);
  await reconcileKind(userId, "conversations", state.conversations);
  await reconcileKind(userId, "playgroundSessions", state.playgroundSessions);
  await reconcileKind(userId, "theme", state.theme);
}

type RemoteState = {
  id: string;
  syncExpiresAt: string | Date | null;
  updatedAt: string | Date;
}[];

async function reconcileKind<K extends SyncKind>(
  userId: number,
  kind: K,
  remote: RemoteState,
) {
  for (const remoteRow of remote) {
    const localRow = await readLocalById(userId, kind, remoteRow.id);
    const remoteUpdatedAt = new Date(remoteRow.updatedAt).getTime();
    const localUpdatedAt = localRow
      ? new Date(localRow.updatedAt).getTime()
      : 0;
    if (remoteUpdatedAt <= localUpdatedAt && localRow) continue;
    try {
      const res = await rpc.api
        .sync({ kind })({ id: remoteRow.id })
        .bundle.get();
      // Eden's inferred return is a union over all sync kinds; runtime
      // discriminator narrows but TS can't follow through templated routes.
      const bundle = handleElysia(res) as SyncBundle<K>;
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
  kind: SyncKind,
  id: string,
): Promise<{ updatedAt: Date } | null> {
  switch (kind) {
    case "characters":
      return (
        (await readLocalCharacters(userId))?.find((r) => r.id === id) ?? null
      );
    case "personas":
      return (
        (await readLocalPersonas(userId))?.find((r) => r.id === id) ?? null
      );
    case "lorebooks":
      return (
        (await readLocalLorebooks(userId))?.find((r) => r.id === id) ?? null
      );
    case "presets":
      return (await readLocalPresets(userId))?.find((r) => r.id === id) ?? null;
    case "cards":
      return (await readLocalCards(userId))?.find((r) => r.id === id) ?? null;
    case "conversations":
      return (
        (await readLocalConversations(userId))?.find((r) => r.id === id) ?? null
      );
    case "playgroundSessions":
      return (
        (await readLocalGenerationSessions(userId))?.find((r) => r.id === id) ??
        null
      );
    case "theme":
      return null;
  }
}

async function applyBundle<K extends SyncKind>(
  userId: number,
  kind: K,
  bundle: SyncBundle<K>,
) {
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
      // Rehydrate bytes into base64 so local row survives R2 expiry/deletion.
      const rehydratedMedia = await Promise.all(b.media.map(rehydrateMedia));
      await upsertLocalConversationBundle(userId, {
        conversation: b.conversation,
        settings: b.settings,
        conversationCharacters: b.conversationCharacters,
        conversationLorebooks: b.conversationLorebooks,
        messages: b.messages,
        messageItems: b.messageItems,
        media: rehydratedMedia,
      });
      return;
    }
    case "playgroundSessions": {
      const b = bundle as SyncBundle<"playgroundSessions">;
      await upsertLocalGenerationSessionBundle(userId, {
        session: b.session,
        playgrounds: b.playgrounds,
        playgroundImages: b.playgroundImages,
        playgroundLikes: b.playgroundLikes,
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

// R2 failures tolerated: surface broken-media placeholder, don't abort apply.
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
