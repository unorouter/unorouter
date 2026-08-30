"use client";

import { msg } from "@/lib/config/constants";
import type { LocalAnyRow } from "@/lib/types";
import { rec, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { upsertLocalConversationBundle } from "@/lib/db/client/data/chat/chat";

// JanitorAI has no export of its own, so a full history arrives as the one file
// the community bulk exporter writes: an object keyed by character_id, each
// holding every chat with that character and every message in it. One file can
// therefore carry hundreds of conversations, unlike every other format here.
//
//   { "<character_id>": {
//       character_id, character_name,
//       chats: [ { chat_id, summary, updated_at, chat_count,
//                  messages: [ { id, is_bot, message, created_at } ] } ] } }

type JaiMessage = {
  id?: string;
  is_bot?: boolean;
  message?: string;
  created_at?: string;
};

type JaiChat = {
  chat_id?: string;
  summary?: string;
  updated_at?: string;
  messages?: JaiMessage[];
};

type JaiCharacter = {
  character_id?: string;
  character_name?: string;
  chats?: JaiChat[];
};

const asMessages = (value: unknown): JaiMessage[] =>
  Array.isArray(value)
    ? value.filter((m): m is JaiMessage => !!rec(m) && typeof m === "object")
    : [];

function asCharacter(value: unknown): JaiCharacter | null {
  const row = rec(value);
  if (!row) return null;
  if (typeof row.character_id !== "string") return null;
  if (!Array.isArray(row.chats)) return null;
  return {
    character_id: row.character_id,
    character_name:
      typeof row.character_name === "string" ? row.character_name : undefined,
    chats: row.chats
      .map((c): JaiChat | null => {
        const chat = rec(c);
        if (!chat) return null;
        return {
          chat_id: typeof chat.chat_id === "string" ? chat.chat_id : undefined,
          summary: typeof chat.summary === "string" ? chat.summary : undefined,
          updated_at:
            typeof chat.updated_at === "string" ? chat.updated_at : undefined,
          messages: asMessages(chat.messages),
        };
      })
      .filter((c): c is JaiChat => c !== null),
  };
}

// The file has no version marker and no wrapper, so it is recognized by shape:
// every value is a character entry carrying a chats array.
export function looksLikeJanitorAiExport(parsed: unknown): boolean {
  const root = rec(parsed);
  if (!root) return false;
  const values = Object.values(root);
  if (values.length === 0) return false;
  return values.every((v) => asCharacter(v) !== null);
}

function mapChat(
  character: JaiCharacter,
  chat: JaiChat,
  index: number,
): {
  convId: string;
  bundle: Parameters<typeof upsertLocalConversationBundle>[0];
} | null {
  const source = chat.messages ?? [];
  if (source.length === 0) return null;

  const convId = uid();
  const charName = character.character_name?.trim() || "JanitorAI";
  // Several chats with the same character are common, so the summary is what
  // tells them apart in the list; it is JanitorAI's own label for the chat.
  const title = chat.summary?.trim()
    ? `${charName}: ${chat.summary.trim()}`
    : charName;

  const messages: LocalAnyRow[] = [];
  const messageItems: Array<LocalAnyRow & { messageId: string }> = [];
  let prevId: string | null = null;

  source.forEach((m, i) => {
    const text = typeof m.message === "string" ? m.message : "";
    if (!text) return;
    const messageId = uid();
    const parsedDate = m.created_at ? dayjs(m.created_at) : null;
    const createdAt =
      parsedDate && parsedDate.isValid()
        ? parsedDate.toDate()
        : dayjs()
            .add(index * 1000 + i, "ms")
            .toDate();

    messages.push({
      id: messageId,
      convId,
      parentId: prevId,
      role: m.is_bot ? "assistant" : "user",
      model: null,
      outputTokens: null,
      createdAt,
      updatedAt: createdAt,
    });
    messageItems.push({
      id: uid(),
      messageId,
      sequenceIndex: 0,
      outputIndex: null,
      type: "text",
      data: { text },
    });
    prevId = messageId;
  });

  if (messages.length === 0) return null;

  return {
    convId,
    bundle: {
      conversation: { id: convId, title },
      settings: { convId, defaultModel: "" },
      conversationCharacters: [],
      conversationLorebooks: [],
      messages,
      messageItems,
      media: [],
      requestLogs: [],
    },
  };
}

export async function importJanitorAiExport(
  parsed: unknown,
): Promise<{ id: string; imported: number }> {
  const root = rec(parsed);
  if (!root) throw new Error(msg("ERRORS.IMPORT_INVALID_JSON"));

  const chats: {
    convId: string;
    bundle: Parameters<typeof upsertLocalConversationBundle>[0];
  }[] = [];
  for (const value of Object.values(root)) {
    const character = asCharacter(value);
    if (!character) continue;
    (character.chats ?? []).forEach((chat, i) => {
      const mapped = mapChat(character, chat, chats.length + i);
      if (mapped) chats.push(mapped);
    });
  }

  if (chats.length === 0) throw new Error(msg("ERRORS.REQUEST_FAILED"));

  // Written one at a time rather than in a transaction: SQLocal's mutex
  // deadlocks every later call if one statement throws, and a partial import of
  // 600 chats is worth keeping.
  for (const chat of chats) {
    await upsertLocalConversationBundle(chat.bundle);
  }

  logChatDebug("import.janitorai.done", { conversations: chats.length });
  return { id: chats[0].convId, imported: chats.length };
}
