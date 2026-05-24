"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  conversationCharacters,
  conversationLorebooks,
  conversations,
  conversationSettings,
  media,
  messageItems,
  messages,
  requestLogs,
} from "@/lib/db/schema/shared";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getLocalDb } from "../client";
import { readLocalRequestLogsForConv } from "./request-log";
import {
  readLocalCharacter,
  readLocalLorebookBundle,
  readLocalPersona,
  readLocalPreset,
} from "./rp";
import { makeTableStore, mergeChildRows, replaceChildRows } from "./table-store";

import type {
  LocalAnyRow as AnyRow,
  LocalChildRow as ChildRow,
  LocalRowInput,
} from "@/lib/types";

const conversationStore = makeTableStore(conversations, conversations.id);
const conversationSettingsStore = makeTableStore(
  conversationSettings,
  conversationSettings.convId,
);
const messageStore = makeTableStore(messages, messages.id);
const messageItemStore = makeTableStore(messageItems, messageItems.id);

export const readLocalConversations = async (userId: number | undefined) => {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return [];
  const rows = await local.db
    .select()
    .from(conversations)
    .leftJoin(
      conversationSettings,
      eq(conversationSettings.convId, conversations.id),
    )
    .where(eq(conversations.userId, uid))
    .orderBy(desc(conversations.updatedAt));
  return rows.map((r) => ({
    ...r.conversations,
    model: r.conversation_settings?.defaultModel ?? null,
  }));
};

export const readLocalConversation = async (
  userId: number | undefined,
  id: string,
) => {
  const [conv, settings] = await Promise.all([
    conversationStore.get(userId, id),
    conversationSettingsStore.get(userId, id, { scopeUser: false }),
  ]);
  if (!conv) return conv;
  return { ...conv, model: settings?.defaultModel ?? null };
};

export const readLocalConversationSettings = (
  userId: number | undefined,
  convId: string,
) => conversationSettingsStore.get(userId, convId, { scopeUser: false });

export async function readLocalMessages(
  userId: number | undefined,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  return local.db
    .select()
    .from(messages)
    .where(eq(messages.convId, convId))
    .orderBy(messages.createdAt);
}

export async function readLocalConversationBindings(
  userId: number | undefined,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const [chars, lbs] = await Promise.all([
    local.db
      .select()
      .from(conversationCharacters)
      .where(eq(conversationCharacters.convId, convId)),
    local.db
      .select()
      .from(conversationLorebooks)
      .where(eq(conversationLorebooks.convId, convId)),
  ]);
  return { conversationCharacters: chars, conversationLorebooks: lbs };
}

export async function readLocalMessageItems(
  userId: number | undefined,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const msgs = await local.db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.convId, convId));
  if (msgs.length === 0) return [];
  const ids = msgs.map((m) => m.id);
  return local.db
    .select()
    .from(messageItems)
    .where(inArray(messageItems.messageId, ids))
    .orderBy(asc(messageItems.sequenceIndex));
}

async function readLocalConversationMedia(
  userId: number | undefined,
  convId: string,
) {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return null;
  return local.db
    .select()
    .from(media)
    .where(and(eq(media.userId, uid), eq(media.convId, convId)));
}

export async function readLocalConversationBundle(
  userId: number | undefined,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const conv = await readLocalConversation(userId, convId);
  if (!conv) return null;
  const [settings, bindings, msgs, items, mediaRows, reqLogRows] =
    await Promise.all([
      readLocalConversationSettings(userId, convId),
      readLocalConversationBindings(userId, convId),
      readLocalMessages(userId, convId),
      readLocalMessageItems(userId, convId),
      readLocalConversationMedia(userId, convId),
      readLocalRequestLogsForConv(userId, convId),
    ]);

  // Resolve the full bodies of every RP entity this conversation references so
  // a sync push is self-contained: the server upserts these before the
  // conversation_* rows, satisfying their foreign keys even when the entity
  // was never synced on its own.
  const characterIds = (bindings?.conversationCharacters ?? []).map(
    (b) => b.characterId,
  );
  const lorebookIds = (bindings?.conversationLorebooks ?? []).map(
    (b) => b.lorebookId,
  );
  const [characterRows, lorebookRows, persona, preset] = await Promise.all([
    Promise.all(characterIds.map((id) => readLocalCharacter(userId, id))),
    Promise.all(lorebookIds.map((id) => readLocalLorebookBundle(userId, id))),
    settings?.personaId
      ? readLocalPersona(userId, settings.personaId)
      : Promise.resolve(null),
    settings?.presetId
      ? readLocalPreset(userId, settings.presetId)
      : Promise.resolve(null),
  ]);
  const characters = characterRows.filter((c) => c != null);
  const lorebooks = lorebookRows.filter((l) => l != null);

  return {
    conversation: conv,
    settings: settings ?? null,
    conversationCharacters: bindings?.conversationCharacters ?? [],
    conversationLorebooks: bindings?.conversationLorebooks ?? [],
    messages: msgs ?? [],
    messageItems: items ?? [],
    media: mediaRows ?? [],
    requestLogs: reqLogRows ?? [],
    characters,
    personas: persona ? [persona] : [],
    lorebooks,
    presets: preset ? [preset] : [],
  };
}

export const upsertLocalConversation = (
  userId: number | undefined,
  row: LocalRowInput & { id: string },
) => conversationStore.upsert(userId, row);

export const deleteLocalConversation = (
  userId: number | undefined,
  id: string,
) => conversationStore.drop(userId, id);

export const upsertLocalMessage = (
  userId: number | undefined,
  row: LocalRowInput & { id: string; convId: string },
) => messageStore.upsert(userId, row, { scopeUser: false });

export const deleteLocalMessage = (userId: number | undefined, msgId: string) =>
  messageStore.drop(userId, msgId, { scopeUser: false });

export const upsertLocalMessageItem = (
  userId: number | undefined,
  row: LocalRowInput & { id: string; messageId: string },
) => messageItemStore.upsert(userId, row, { scopeUser: false });

export const upsertLocalConversationSettings = (
  userId: number | undefined,
  row: LocalRowInput & { convId: string },
) => conversationSettingsStore.upsert(userId, row, { scopeUser: false });

export async function deleteLocalMessagesForConv(
  userId: number | undefined,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await local.db.delete(messages).where(eq(messages.convId, convId));
}

export async function replaceLocalMessageItems(
  userId: number | undefined,
  messageId: string,
  items: Array<LocalRowInput & { id: string }>,
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  await replaceChildRows(
    local.db,
    messageItems,
    messageItems.messageId,
    messageId,
    items,
    (it) => ({ ...it, messageId }),
  );
}

export async function replaceLocalConversationBindings(
  userId: number | undefined,
  convId: string,
  bindings: {
    conversationCharacters?: Array<{
      characterId: string;
      orderIndex?: number;
      isActive?: boolean;
      overrides?: unknown;
    }>;
    conversationLorebooks?: Array<{ lorebookId: string; orderIndex?: number }>;
  },
) {
  const local = await getLocalDb(userId);
  if (!local) return;
  if (bindings.conversationCharacters) {
    await replaceChildRows(
      local.db,
      conversationCharacters,
      conversationCharacters.convId,
      convId,
      bindings.conversationCharacters,
      (row, i) => ({
        convId,
        characterId: row.characterId,
        orderIndex: row.orderIndex ?? i,
        isActive: row.isActive ?? true,
        overrides: row.overrides ?? null,
      }),
    );
  }
  if (bindings.conversationLorebooks) {
    await replaceChildRows(
      local.db,
      conversationLorebooks,
      conversationLorebooks.convId,
      convId,
      bindings.conversationLorebooks,
      (row, i) => ({
        convId,
        lorebookId: row.lorebookId,
        orderIndex: row.orderIndex ?? i,
      }),
    );
  }
}

// No `local.transaction(...)` wrapper: SQLocal's transactionMutex deadlocks
// drizzle sqlite-proxy queries that lack the transactionKey. Cascade order is
// enough since bundle writes are idempotent upserts.
export async function upsertLocalConversationBundle(
  userId: number | undefined,
  bundle: {
    conversation: AnyRow;
    settings: ChildRow | null;
    conversationCharacters: ChildRow[];
    conversationLorebooks: ChildRow[];
    messages: AnyRow[];
    messageItems: AnyRow[];
    media: AnyRow[];
    requestLogs: ChildRow[];
  },
): Promise<{ skippedLocalNewer: number }> {
  const local = await getLocalDb(userId);
  if (!local) return { skippedLocalNewer: 0 };
  await conversationStore.upsert(userId, bundle.conversation);

  // Per-row merge instead of delete-then-insert: local-only edits to
  // settings / bindings / media survive a sync-pull. Authoritative-replace
  // is still available via replaceChildRows on the import paths.
  if (bundle.settings) {
    await local.db
      .insert(conversationSettings)
      .values(bundle.settings as never)
      .onConflictDoUpdate({
        target: conversationSettings.convId,
        set: bundle.settings as never,
      });
  }

  const convId = bundle.conversation.id;
  // conversation_characters PK is (convId, characterId); conv_lorebooks is
  // (convId, lorebookId). Use mergeChildRows with the composite PK.
  await mergeChildRows(
    local.db,
    conversationCharacters,
    [conversationCharacters.convId, conversationCharacters.characterId],
    bundle.conversationCharacters,
  );
  await mergeChildRows(
    local.db,
    conversationLorebooks,
    [conversationLorebooks.convId, conversationLorebooks.lorebookId],
    bundle.conversationLorebooks,
  );

  // Per-row merge by updatedAt so local-only branches survive a re-pull.
  const existingMessages = (await local.db
    .select({ id: messages.id, updatedAt: messages.updatedAt })
    .from(messages)
    .where(eq(messages.convId, convId))) as Array<{
    id: string;
    updatedAt: Date | number | string | null;
  }>;
  const localMsgUpdatedAt = new Map<string, number>(
    existingMessages.map((m) => [
      m.id,
      m.updatedAt ? new Date(m.updatedAt).getTime() : 0,
    ]),
  );
  const remoteMsgIds = new Set<string>();
  const replacedMsgIds: string[] = [];
  let skippedLocalNewer = 0;
  for (const m of bundle.messages) {
    remoteMsgIds.add(m.id);
    const local = localMsgUpdatedAt.get(m.id);
    const remote = m.updatedAt
      ? new Date(m.updatedAt as Date | number | string).getTime()
      : 0;
    if (local !== undefined && local >= remote) {
      if (local > remote) skippedLocalNewer++;
      continue;
    }
    await messageStore.upsert(userId, m, { scopeUser: false });
    replacedMsgIds.push(m.id);
  }

  // Refresh items only for messages whose parent row was overwritten.
  if (replacedMsgIds.length > 0) {
    await local.db
      .delete(messageItems)
      .where(inArray(messageItems.messageId, replacedMsgIds));
  }
  for (const it of bundle.messageItems) {
    if (!remoteMsgIds.has(it.messageId as string)) continue;
    if (!replacedMsgIds.includes(it.messageId as string)) continue;
    await local.db.insert(messageItems).values(it as never);
  }

  // Media keyed on row id (single PK), not convId. mergeChildRows preserves
  // local-only attachments and the asymmetric base64 cache.
  await mergeChildRows(local.db, media, media.id, bundle.media);

  // Logs PK by msgId; idempotent upsert keeps server-canonical row.
  for (const log of bundle.requestLogs) {
    await local.db
      .insert(requestLogs)
      .values(log as never)
      .onConflictDoUpdate({ target: requestLogs.msgId, set: log as never });
  }
  return { skippedLocalNewer };
}
