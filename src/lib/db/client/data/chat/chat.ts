"use client";

import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { dayjs } from "@/lib/utils/format/date";
import {
  characters,
  chatGroups,
  conversationCharacters,
  conversationLorebooks,
  conversations,
  lorebooks,
  media,
  messageItems,
  messages,
  requestLogs,
} from "@/lib/db/schema/shared";
import {
  parseRegexScripts,
  type RegexScript,
} from "@/lib/ai/chat/regex-scripts";
import {
  itemsToParts,
  joinItemsToMessages,
  walkActiveBranch,
} from "@/lib/ai/chat/messages";
import { parseTriggerScripts } from "@/lib/ai/chat/triggers/vm";
import type { TriggerScript } from "@/lib/ai/chat/triggers/types";
import {
  CONVERSATION_SETTINGS_KEYS,
  projectConversationSettings,
} from "@/lib/db/conversation-settings";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
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

export const readLocalConversations = async () => {
  const local = await getLocalDb();
  if (!local) return [];
  const rows = await local.db
    .select({
      id: conversations.id,
      title: conversations.title,
      defaultModel: conversations.defaultModel,
      totalInputTokens: conversations.totalInputTokens,
      totalOutputTokens: conversations.totalOutputTokens,
      totalCost: conversations.totalCost,
      groupId: conversations.groupId,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .orderBy(desc(conversations.updatedAt));
  return rows.map((r) => ({ ...r, model: r.defaultModel ?? null }));
};

const chatGroupStore = makeTableStore(chatGroups, chatGroups.id);

export const readLocalChatGroups = async () => {
  const local = await getLocalDb();
  if (!local) return [];
  return local.db
    .select()
    .from(chatGroups)
    .orderBy(asc(chatGroups.orderIndex), asc(chatGroups.createdAt));
};

export const upsertLocalChatGroup = (row: LocalRowInput & { id: string }) =>
  chatGroupStore.upsert(row);

export const deleteLocalChatGroup = async (groupId: string) => {
  const local = await getLocalDb();
  if (!local) return;
  await local.db
    .update(conversations)
    .set({ groupId: null })
    .where(eq(conversations.groupId, groupId));
  await chatGroupStore.drop(groupId);
};

export const renameLocalChatGroup = (groupId: string, name: string) =>
  chatGroupStore.update(groupId, { name });

export const setChatGroupFolded = (groupId: string, folded: boolean) =>
  chatGroupStore.update(groupId, { folded });

export const setConversationGroup = (convId: string, groupId: string | null) =>
  conversationStore.update(convId, { groupId });

export const readLocalConversation = async (id: string) => {
  const conv = await conversationStore.get(id);
  if (!conv) return conv;
  return { ...conv, model: conv.defaultModel ?? null };
};

export const readLocalConversationSettings = async (convId: string) => {
  const conv = await conversationStore.get(convId);
  return conv ? projectConversationSettings(conv) : null;
};

export async function readLocalMessages(convId: string) {
  const local = await getLocalDb();
  if (!local) return null;
  return local.db
    .select()
    .from(messages)
    .where(eq(messages.convId, convId))
    .orderBy(messages.createdAt);
}

export async function readJoinedMessages(convId: string) {
  const [msgs, items] = await Promise.all([
    readLocalMessages(convId),
    readLocalMessageItems(convId),
  ]);
  return joinItemsToMessages(msgs ?? [], items ?? []);
}

export async function readActiveBranchParts(convId: string) {
  const joined = await readJoinedMessages(convId);
  return walkActiveBranch(joined).path.map((m) => ({
    id: m.id,
    role: m.role,
    parts: itemsToParts(m.items),
  }));
}

// The visible conversation as plain text: active branch only, and only the
// parts a reader sees. Reasoning, tool calls and media are left out, since the
// point is to paste the conversation somewhere, not to reproduce the request.
export async function readActiveBranchTranscript(
  convId: string,
): Promise<string> {
  const branch = await readActiveBranchParts(convId);
  return branch
    .map((m) => {
      const text = m.parts
        .flatMap((p) => (p.type === "text" ? [p.text] : []))
        .join("\n\n")
        .trim();
      return text ? `${m.role === "user" ? "User" : "Assistant"}:\n${text}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export async function readConvHistoryForSend(convId: string) {
  const joined = await readJoinedMessages(convId);
  return {
    branch: walkActiveBranch(joined).path.map((m) => ({
      id: m.id,
      role: m.role,
      parts: itemsToParts(m.items),
    })),
    allIds: new Set(joined.map((m) => m.id)),
    activeCount: joined.filter((m) => m.isActiveBranch !== false).length,
  };
}

export async function readLocalMessageMetaForConv(convId: string) {
  const local = await getLocalDb();
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

export async function readLocalConversationBindings(convId: string) {
  const local = await getLocalDb();
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

export async function readPrimaryCharacter(convId: string) {
  const local = await getLocalDb();
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

export async function readConvRegexScripts(
  convId: string,
): Promise<RegexScript[]> {
  const ch = await readPrimaryCharacter(convId);
  return parseRegexScripts(ch?.regexScripts);
}

export async function readConvTriggers(
  convId: string,
): Promise<TriggerScript[]> {
  const ch = await readPrimaryCharacter(convId);
  return parseTriggerScripts(ch?.triggers);
}

export async function readLocalMessageItems(convId: string) {
  const local = await getLocalDb();
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

async function readLocalConversationMedia(convId: string) {
  const local = await getLocalDb();
  if (!local) return null;
  return local.db.select().from(media).where(eq(media.convId, convId));
}

export async function readLocalConversationBundle(convId: string) {
  const local = await getLocalDb();
  if (!local) return null;
  const conv = await readLocalConversation(convId);
  if (!conv) return null;
  const settings = projectConversationSettings(conv);
  const [bindings, msgs, items, mediaRows, reqLogRows] = await Promise.all([
    readLocalConversationBindings(convId),
    readLocalMessages(convId),
    readLocalMessageItems(convId),
    readLocalConversationMedia(convId),
    readLocalRequestLogsForConv(convId),
  ]);

  const characterIds = (bindings?.conversationCharacters ?? []).map(
    (b) => b.characterId,
  );
  const lorebookIds = (bindings?.conversationLorebooks ?? []).map(
    (b) => b.lorebookId,
  );
  const [characterRows, lorebookRows, persona, preset] = await Promise.all([
    Promise.all(characterIds.map((id) => readLocalCharacter(id))),
    Promise.all(lorebookIds.map((id) => readLocalLorebookBundle(id))),
    settings?.personaId
      ? readLocalPersona(settings.personaId)
      : Promise.resolve(null),
    settings?.presetId
      ? readLocalPreset(settings.presetId)
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

export const upsertLocalConversation = (row: LocalRowInput & { id: string }) =>
  conversationStore.upsert(row);

export const deleteLocalConversation = (id: string) =>
  conversationStore.drop(id);

export const upsertLocalMessage = (
  row: LocalRowInput & { id: string; convId: string },
) => messageStore.upsert(row);

const deleteLocalMessage = (msgId: string) => messageStore.drop(msgId);

export const upsertLocalMessageItem = (
  row: LocalRowInput & { id: string; messageId: string },
) => messageItemStore.upsert(row);

export const upsertLocalConversationSettings = (
  row: LocalRowInput & { convId: string },
) => {
  const next: LocalRowInput & { id: string } = { ...row, id: row.convId };
  delete next.convId;
  return conversationStore.upsert(next);
};

export const updateLocalConversationSettings = (
  row: LocalRowInput & { convId: string },
) => {
  const patch: Record<string, unknown> = { ...row };
  delete patch.convId;
  return conversationStore.update(row.convId, patch);
};

export async function deleteLocalMessagesForConv(convId: string) {
  const local = await getLocalDb();
  if (!local) return;
  await local.db.delete(messages).where(eq(messages.convId, convId));
}

export async function bumpLocalConvUpdatedAt(convId: string) {
  const conv = await readLocalConversation(convId);
  if (conv) {
    await upsertLocalConversation({
      ...conv,
      updatedAt: dayjs().toDate(),
    });
  }
}

export async function setLocalActiveBranch(convId: string, msgId: string) {
  const msgs = (await readLocalMessages(convId)) ?? [];
  const target = msgs.find((m) => m.id === msgId);
  // An unknown id must be a no-op: falling through resolves parentId to null and
  // deactivates EVERY root row, greeting siblings included.
  if (!target) {
    logChatDebug("branch.switch_unknown_id", { convId, msgId });
    return;
  }
  const parentId = target.parentId ?? null;
  const now = dayjs().toDate();
  for (const m of msgs) {
    if ((m.parentId ?? null) === parentId) {
      await upsertLocalMessage({
        ...m,
        isActiveBranch: m.id === msgId,
        updatedAt: now,
      });
    }
  }
  if (parentId === null && target?.role === "assistant") {
    await updateLocalConversationSettings({
      convId,
      firstMsgIndex: (target.branchIndex ?? 0) - 1,
    });
  }
  await bumpLocalConvUpdatedAt(convId);
}

export async function spliceDeleteLocalMessage(convId: string, msgId: string) {
  const msgs = (await readLocalMessages(convId)) ?? [];
  const target = msgs.find((m) => m.id === msgId);
  const newParentId = target?.parentId ?? null;
  const now = dayjs().toDate();
  const children = msgs.filter((m) => m.parentId === msgId);

  // Re-parenting N children onto the parent turns one deletion into N new
  // siblings, and sibling count IS the branch count, so deleting a message with
  // several retries under it made the counter go UP (2 children -> 4 branches).
  // Only a single child is an unambiguous splice; anything else is a fork whose
  // subtree goes with it.
  if (children.length > 1) {
    const doomed = new Set<string>([msgId]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const m of msgs) {
        if (!doomed.has(m.id) && m.parentId && doomed.has(m.parentId)) {
          doomed.add(m.id);
          grew = true;
        }
      }
    }
    logChatDebug("delete.subtree", { msgId, removed: doomed.size });
    for (const id of doomed) await deleteLocalMessage(id);
    await bumpLocalConvUpdatedAt(convId);
    return;
  }

  const childIds: string[] = [];
  for (const m of children) {
    childIds.push(m.id);
    await upsertLocalMessage({ ...m, parentId: newParentId, updatedAt: now });
  }
  if (childIds.length > 0) {
    const check = (await readLocalMessages(convId)) ?? [];
    for (const id of childIds) {
      const child = check.find((m) => m.id === id);
      if (child && child.parentId === msgId) {
        logChatDebug("delete.splice_retry", { msgId, child: id });
        await upsertLocalMessage({
          ...child,
          parentId: newParentId,
          updatedAt: now,
        });
      }
    }
  }
  await deleteLocalMessage(msgId);
  await bumpLocalConvUpdatedAt(convId);
}

export async function replaceLocalMessageItems(
  messageId: string,
  items: Array<InferInsertModel<typeof messageItems> & { id: string }>,
) {
  const local = await getLocalDb();
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
  const local = await getLocalDb();
  if (!local) return;
  if (bindings.conversationCharacters) {
    // The sticky loadout cookie outlives its entities, and binding a missing
    // character id trips the FK constraint and kills chat creation.
    const wantedCharIds = bindings.conversationCharacters.map(
      (row) => row.characterId,
    );
    const knownChars = wantedCharIds.length
      ? await local.db
          .select({ id: characters.id })
          .from(characters)
          .where(inArray(characters.id, wantedCharIds))
      : [];
    const knownCharIds = new Set(knownChars.map((row) => row.id));
    await replaceChildRows(
      local.db,
      conversationCharacters,
      conversationCharacters.convId,
      convId,
      bindings.conversationCharacters.filter((row) =>
        knownCharIds.has(row.characterId),
      ),
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
    const wantedLbIds = bindings.conversationLorebooks.map(
      (row) => row.lorebookId,
    );
    const knownLbs = wantedLbIds.length
      ? await local.db
          .select({ id: lorebooks.id })
          .from(lorebooks)
          .where(inArray(lorebooks.id, wantedLbIds))
      : [];
    const knownLbIds = new Set(knownLbs.map((row) => row.id));
    await replaceChildRows(
      local.db,
      conversationLorebooks,
      conversationLorebooks.convId,
      convId,
      bindings.conversationLorebooks.filter((row) =>
        knownLbIds.has(row.lorebookId),
      ),
      (row, i) => ({
        convId,
        lorebookId: row.lorebookId,
        orderIndex: row.orderIndex ?? i,
      }),
    );
  }
}

type BundleStamp = Date | number | string | null | undefined;

export async function upsertLocalConversationBundle(bundle: {
  conversation: AnyRow & { updatedAt?: BundleStamp };
  settings: ChildRow | null;
  conversationCharacters: Array<
    InferInsertModel<typeof conversationCharacters>
  >;
  conversationLorebooks: Array<InferInsertModel<typeof conversationLorebooks>>;
  messages: Array<AnyRow & { updatedAt?: BundleStamp }>;
  messageItems: Array<AnyRow & { messageId: string }>;
  media: Array<InferInsertModel<typeof media>>;
  requestLogs: ChildRow[];
}): Promise<{ skippedLocalNewer: number }> {
  const local = await getLocalDb();
  if (!local) return { skippedLocalNewer: 0 };
  const convRow = bundle.settings
    ? {
        ...bundle.conversation,
        ...Object.fromEntries(
          CONVERSATION_SETTINGS_KEYS.filter((k) => k in bundle.settings!).map(
            (k) => [k, bundle.settings![k]],
          ),
        ),
      }
    : bundle.conversation;
  await conversationStore.upsert(convRow);

  const convId = bundle.conversation.id;
  await mergeChildRows(
    local.db,
    conversationCharacters,
    [conversationCharacters.convId, conversationCharacters.characterId],
    bundle.conversationCharacters,
    (row) => row,
  );
  await mergeChildRows(
    local.db,
    conversationLorebooks,
    [conversationLorebooks.convId, conversationLorebooks.lorebookId],
    bundle.conversationLorebooks,
    (row) => row,
  );

  const existingMessages = await local.db
    .select({ id: messages.id, updatedAt: messages.updatedAt })
    .from(messages)
    .where(eq(messages.convId, convId));
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
    const remote = m.updatedAt ? new Date(m.updatedAt).getTime() : 0;
    if (local !== undefined && local >= remote) {
      if (local > remote) skippedLocalNewer++;
      continue;
    }
    await messageStore.upsert(m);
    replacedMsgIds.push(m.id);
  }

  if (replacedMsgIds.length > 0) {
    await local.db
      .delete(messageItems)
      .where(inArray(messageItems.messageId, replacedMsgIds));
  }
  for (const it of bundle.messageItems) {
    if (!remoteMsgIds.has(it.messageId)) continue;
    if (!replacedMsgIds.includes(it.messageId)) continue;
    await local.db.insert(messageItems).values(it as never);
  }

  const remoteConvStamp = bundle.conversation.updatedAt
    ? new Date(bundle.conversation.updatedAt).getTime()
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

  const remoteCharIds = new Set(
    bundle.conversationCharacters.map((c) => c.characterId),
  );
  const remoteLbIds = new Set(
    bundle.conversationLorebooks.map((l) => l.lorebookId),
  );
  const localBindings = await readLocalConversationBindings(convId);
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

  await mergeChildRows(local.db, media, media.id, bundle.media, (row) => row);

  for (const log of bundle.requestLogs) {
    await local.db
      .insert(requestLogs)
      .values(log as never)
      .onConflictDoUpdate({ target: requestLogs.msgId, set: log });
  }
  return { skippedLocalNewer };
}
