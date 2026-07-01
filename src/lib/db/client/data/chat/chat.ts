"use client";

import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  characters,
  chatGroups,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  media,
  messageItems,
  messages,
  requestLogs,
} from "@/lib/db/schema/shared";
import {
  parseRegexScripts,
  type RegexScript,
} from "@/lib/ai/chat/regex-scripts";
import { parseTriggerScripts } from "@/lib/ai/chat/triggers/vm";
import type { TriggerScript } from "@/lib/ai/chat/triggers/types";
import {
  CONVERSATION_SETTINGS_KEYS,
  projectConversationSettings,
} from "@/lib/db/conversation-settings";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getLocalDb } from "@/lib/db/client/client";
import { readLocalRequestLogsForConv } from "@/lib/db/client/data/chat/request-log";
import {
  readLocalCharacter,
  readLocalLorebookBundle,
  readLocalPersona,
  readLocalPreset,
} from "@/lib/db/client/data/rp/rp";
import {
  makeTableStore,
  mergeChildRows,
  replaceChildRows,
} from "@/lib/db/client/data/table-store";

import type {
  LocalAnyRow as AnyRow,
  LocalChildRow as ChildRow,
  LocalRowInput,
} from "@/lib/types";

const conversationStore = makeTableStore(conversations, conversations.id);
const messageStore = makeTableStore(messages, messages.id);
const messageItemStore = makeTableStore(messageItems, messageItems.id);

// List projection: select * would drag summaryMemory/vars/extraBody blobs through OPFS on every sidebar render.
export const readLocalConversations = async (userId: number | undefined) => {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return [];
  const rows = await local.db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      title: conversations.title,
      defaultModel: conversations.defaultModel,
      totalInputTokens: conversations.totalInputTokens,
      totalOutputTokens: conversations.totalOutputTokens,
      totalCost: conversations.totalCost,
      groupId: conversations.groupId,
      syncExpiresAt: conversations.syncExpiresAt,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(eq(conversations.userId, uid))
    .orderBy(desc(conversations.updatedAt));
  return rows.map((r) => ({ ...r, model: r.defaultModel ?? null }));
};

const chatGroupStore = makeTableStore(chatGroups, chatGroups.id);

export const readLocalChatGroups = async (userId: number | undefined) => {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return [];
  return local.db
    .select()
    .from(chatGroups)
    .where(eq(chatGroups.userId, uid))
    .orderBy(asc(chatGroups.orderIndex), asc(chatGroups.createdAt));
};

export const upsertLocalChatGroup = (
  userId: number | undefined,
  row: LocalRowInput & { id: string },
) => chatGroupStore.upsert(userId, row);

export const deleteLocalChatGroup = async (
  userId: number | undefined,
  groupId: string,
) => {
  const uid = userId ?? GUEST_USER_ID;
  const local = await getLocalDb(uid);
  if (!local) return;
  // Ungroup the chats first (keep them), then drop the group row.
  await local.db
    .update(conversations)
    .set({ groupId: null })
    .where(
      and(eq(conversations.userId, uid), eq(conversations.groupId, groupId)),
    );
  await chatGroupStore.drop(userId, groupId);
};

export const reorderLocalChatGroups = async (
  userId: number | undefined,
  orderedIds: string[],
) => {
  for (let i = 0; i < orderedIds.length; i++) {
    await chatGroupStore.update(userId, orderedIds[i], { orderIndex: i });
  }
};

export const renameLocalChatGroup = (
  userId: number | undefined,
  groupId: string,
  name: string,
) => chatGroupStore.update(userId, groupId, { name });

export const setChatGroupFolded = (
  userId: number | undefined,
  groupId: string,
  folded: boolean,
) => chatGroupStore.update(userId, groupId, { folded });

// Partial update (never insert): the conversation row is owned by the create/stream path.
export const setConversationGroup = (
  userId: number | undefined,
  convId: string,
  groupId: string | null,
) => conversationStore.update(userId, convId, { groupId });

export const readLocalConversation = async (
  userId: number | undefined,
  id: string,
) => {
  const conv = await conversationStore.get(userId, id);
  if (!conv) return conv;
  return { ...conv, model: conv.defaultModel ?? null };
};

export const readLocalConversationSettings = async (
  userId: number | undefined,
  convId: string,
) => {
  const conv = await conversationStore.get(userId, convId);
  return conv ? projectConversationSettings(conv) : null;
};

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

// Metadata-only message projection for diagnostics: skips heavy item/content columns so a
// chat-heavy DB doesn't materialize every full message row into memory (mobile OOM on export).
export async function readLocalMessageMetaForConv(
  userId: number | undefined,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return [];
  return local.db
    .select({
      id: messages.id,
      convId: messages.convId,
      parentId: messages.parentId,
      role: messages.role,
      model: messages.model,
      branchIndex: messages.branchIndex,
      isActiveBranch: messages.isActiveBranch,
      createdAt: messages.createdAt,
    })
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

// Primary (lowest orderIndex) character row for a conversation, or null.
async function readPrimaryCharacter(
  userId: number | undefined,
  convId: string,
) {
  const local = await getLocalDb(userId);
  if (!local) return null;
  const rows = await local.db
    .select({ characterId: conversationCharacters.characterId })
    .from(conversationCharacters)
    .where(eq(conversationCharacters.convId, convId))
    .orderBy(asc(conversationCharacters.orderIndex))
    .limit(1);
  const charId = rows[0]?.characterId;
  if (!charId) return null;
  const charRows = await local.db
    .select()
    .from(characters)
    .where(eq(characters.id, charId))
    .limit(1);
  return charRows[0] ?? null;
}

// Primary character's regex scripts, parsed. History adapter runs editoutput on assistant replies with them.
export async function readConvRegexScripts(
  userId: number | undefined,
  convId: string,
): Promise<RegexScript[]> {
  const ch = await readPrimaryCharacter(userId, convId);
  return parseRegexScripts(ch?.regexScripts);
}

// Primary character's parsed trigger scripts; the history adapter runs output-mode triggers with them after reply.
export async function readConvTriggers(
  userId: number | undefined,
  convId: string,
): Promise<TriggerScript[]> {
  const ch = await readPrimaryCharacter(userId, convId);
  return parseTriggerScripts(ch?.triggers);
}

// Delta-scope readers for the outbox drainer ("msgs" hint).
export async function readLocalMessagesByIds(
  userId: number | undefined,
  ids: string[],
) {
  const local = await getLocalDb(userId);
  if (!local || ids.length === 0) return [];
  // Parents before children: the server inserts in payload order and messages.parent_id is a FK.
  return local.db
    .select()
    .from(messages)
    .where(inArray(messages.id, ids))
    .orderBy(asc(messages.createdAt));
}

export async function readLocalMessageItemsByMsgIds(
  userId: number | undefined,
  ids: string[],
) {
  const local = await getLocalDb(userId);
  if (!local || ids.length === 0) return [];
  return local.db
    .select()
    .from(messageItems)
    .where(inArray(messageItems.messageId, ids))
    .orderBy(asc(messageItems.sequenceIndex));
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
  const settings = projectConversationSettings(conv);
  const [bindings, msgs, items, mediaRows, reqLogRows] = await Promise.all([
    readLocalConversationBindings(userId, convId),
    readLocalMessages(userId, convId),
    readLocalMessageItems(userId, convId),
    readLocalConversationMedia(userId, convId),
    readLocalRequestLogsForConv(userId, convId),
  ]);

  // Inline RP entity bodies so the export bundle is self-contained.
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
) => {
  const next = { ...row, id: row.convId } as LocalRowInput & { id: string };
  delete (next as Record<string, unknown>).convId;
  return conversationStore.upsert(userId, next);
};

// Settings-only patch on an existing conversation row, never creates it. Avoids the upsert NOT NULL trip on a partial.
export const updateLocalConversationSettings = (
  userId: number | undefined,
  row: LocalRowInput & { convId: string },
) => {
  const patch = { ...row } as Record<string, unknown>;
  delete patch.convId;
  return conversationStore.update(userId, row.convId, patch);
};

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

// No local.transaction(): SQLocal mutex deadlocks drizzle proxy queries.
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
  // Settings cols live on the conversation row; fold the bundle's settings in.
  const convRow = bundle.settings
    ? {
        ...bundle.conversation,
        ...Object.fromEntries(
          CONVERSATION_SETTINGS_KEYS.filter(
            (k) => k in (bundle.settings as object),
          ).map((k) => [k, (bundle.settings as Record<string, unknown>)[k]]),
        ),
      }
    : bundle.conversation;
  await conversationStore.upsert(userId, convRow);

  const convId = bundle.conversation.id;
  // Composite PK; use mergeChildRows.
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

  // Import merge: a local message absent from the bundle is dropped UNLESS newer than the conv stamp. Items cascade.
  const remoteConvStamp = bundle.conversation.updatedAt
    ? new Date(
        bundle.conversation.updatedAt as Date | number | string,
      ).getTime()
    : 0;
  const staleMsgIds = existingMessages
    .filter(
      (m) =>
        !remoteMsgIds.has(m.id) &&
        (localMsgUpdatedAt.get(m.id) ?? 0) <= remoteConvStamp,
    )
    .map((m) => m.id);
  if (staleMsgIds.length > 0) {
    await local.db.delete(messages).where(inArray(messages.id, staleMsgIds));
  }

  // Same for bindings: joins absent from the bundle are dropped. createdAt guards local-only bindings.
  const remoteCharIds = new Set(
    bundle.conversationCharacters.map((c) => c.characterId as string),
  );
  const remoteLbIds = new Set(
    bundle.conversationLorebooks.map((l) => l.lorebookId as string),
  );
  const localBindings = await readLocalConversationBindings(userId, convId);
  for (const c of localBindings?.conversationCharacters ?? []) {
    const created = c.createdAt ? new Date(c.createdAt).getTime() : 0;
    if (!remoteCharIds.has(c.characterId) && created <= remoteConvStamp) {
      await local.db
        .delete(conversationCharacters)
        .where(
          and(
            eq(conversationCharacters.convId, convId),
            eq(conversationCharacters.characterId, c.characterId),
          ),
        );
    }
  }
  for (const l of localBindings?.conversationLorebooks ?? []) {
    const created = l.createdAt ? new Date(l.createdAt).getTime() : 0;
    if (!remoteLbIds.has(l.lorebookId) && created <= remoteConvStamp) {
      await local.db
        .delete(conversationLorebooks)
        .where(
          and(
            eq(conversationLorebooks.convId, convId),
            eq(conversationLorebooks.lorebookId, l.lorebookId),
          ),
        );
    }
  }

  // Media keyed on row id; mergeChildRows preserves local-only + base64 cache.
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
