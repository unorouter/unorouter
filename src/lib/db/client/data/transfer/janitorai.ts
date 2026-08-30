"use client";

import { msg } from "@/lib/config/constants";
import type { LocalAnyRow } from "@/lib/types";
import { rec, uid } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { upsertLocalConversationBundle } from "@/lib/db/client/data/chat/chat";
import {
  upsertLocalCharacter,
  upsertLocalLorebookBundle,
} from "@/lib/db/client/data/rp/rp";
import { upsertLocalMedia } from "@/lib/db/client/data/media/media";

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
  // false marks a swipe the user rejected. It carries the timestamp of when it
  // was generated, which can be LATER than the turn that replaced it, so
  // importing one as a normal message reorders the conversation.
  is_main?: boolean;
  message?: string;
  created_at?: string;
};

type JaiChat = {
  chat_id?: string;
  summary?: string;
  updated_at?: string;
  persona?: JaiPersona;
  messages?: JaiMessage[];
};

type JaiPersona = {
  name?: string;
  appearance?: string;
  pronouns?: string | null;
};

type JaiCard = {
  name?: string;
  description?: string;
  personality?: string;
  scenario?: string;
  first_mes?: string;
  mes_example?: string;
  creator?: string;
  alternate_greetings?: string[];
  tags?: string[];
  // The avatar BYTES, not its url: janitorai rotates and deletes avatars, so a
  // link would rot while the export is meant to outlive the account.
  avatar_data?: { mimeType?: string; base64?: string } | null;
  // Present only when the creator hid the definition AND left allow_proxy on:
  // the prompt JanitorAI assembles still contains it, but already flattened, so
  // it cannot be split back into fields.
  assembled_prompt?: string | null;
};

type JaiLorebook = {
  id?: string;
  title?: string;
  entries?: unknown[];
  scan_depth?: number;
};

type JaiCharacter = {
  character_id?: string;
  character_name?: string;
  card?: JaiCard;
  lorebooks?: JaiLorebook[];
  chats?: JaiChat[];
};

// Derived from JanitorAI's own ids so a re-import UPDATES what it created last
// time instead of adding a second copy of every chat. Prefixed because these
// ids share a table with locally created rows, whose uid() must never collide.
const jaiId = (kind: string, id: string | number) => `jai-${kind}-${id}`;

const asMessages = (value: unknown): JaiMessage[] =>
  Array.isArray(value)
    ? value.filter((m): m is JaiMessage => !!rec(m) && typeof m === "object")
    : [];

function asCharacter(value: unknown): JaiCharacter | null {
  const row = rec(value);
  if (!row) return null;
  if (typeof row.character_id !== "string") return null;
  if (!Array.isArray(row.chats)) return null;
  const cardRow = rec(row.card);
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  const card: JaiCard | undefined = cardRow
    ? {
        name: str(cardRow.name),
        description: str(cardRow.description),
        personality: str(cardRow.personality),
        scenario: str(cardRow.scenario),
        first_mes: str(cardRow.first_mes),
        mes_example: str(cardRow.mes_example),
        creator: str(cardRow.creator),
        alternate_greetings: Array.isArray(cardRow.alternate_greetings)
          ? cardRow.alternate_greetings.filter(
              (g): g is string => typeof g === "string" && g.length > 0,
            )
          : undefined,
        tags: Array.isArray(cardRow.tags)
          ? cardRow.tags.filter(
              (t): t is string => typeof t === "string" && t.length > 0,
            )
          : undefined,
        avatar_data: (() => {
          const img = rec(cardRow.avatar_data);
          const base64 = str(img?.base64);
          if (!base64) return null;
          return { mimeType: str(img?.mimeType) ?? "image/png", base64 };
        })(),
        assembled_prompt: str(cardRow.assembled_prompt) ?? null,
      }
    : undefined;
  return {
    character_id: row.character_id,
    character_name:
      typeof row.character_name === "string" ? row.character_name : undefined,
    card,
    lorebooks: Array.isArray(row.lorebooks)
      ? row.lorebooks
          .map((b): JaiLorebook | null => {
            const book = rec(b);
            if (!book || !Array.isArray(book.entries)) return null;
            return {
              id: typeof book.id === "string" ? book.id : undefined,
              title: typeof book.title === "string" ? book.title : undefined,
              entries: book.entries,
              scan_depth:
                typeof book.scan_depth === "number"
                  ? book.scan_depth
                  : undefined,
            };
          })
          .filter((b): b is JaiLorebook => b !== null)
      : undefined,
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
          persona: (() => {
            const p = rec(chat.persona);
            if (!p) return undefined;
            const name = typeof p.name === "string" ? p.name : undefined;
            if (!name) return undefined;
            return {
              name,
              appearance:
                typeof p.appearance === "string" ? p.appearance : undefined,
              pronouns: typeof p.pronouns === "string" ? p.pronouns : undefined,
            };
          })(),
        };
      })
      .filter((c): c is JaiChat => c !== null),
  };
}

// Two shapes reach this: the community bulk exporter writes the characters map
// bare, ours wraps it so it can also carry cards, lorebooks and the list of
// things the account could not read. Neither carries a version marker, so both
// are recognized by shape.
function charactersMap(parsed: unknown): Record<string, unknown> | null {
  const root = rec(parsed);
  if (!root) return null;
  const wrapped = rec(root.characters);
  const map = wrapped ?? root;
  const values = Object.values(map);
  if (values.length === 0) return null;
  return values.every((v) => asCharacter(v) !== null) ? map : null;
}

export function looksLikeJanitorAiExport(parsed: unknown): boolean {
  return charactersMap(parsed) !== null;
}

function mapChat(
  character: JaiCharacter,
  chat: JaiChat,
  index: number,
): {
  convId: string;
  bundle: Parameters<typeof upsertLocalConversationBundle>[0];
} | null {
  // Rejected swipes are dropped from the imported branch: they are timestamped
  // when they were generated, so keeping them inline reorders the conversation
  // and puts a discarded reply after the turn that replaced it.
  const source = (chat.messages ?? []).filter((m) => m.is_main !== false);
  if (source.length === 0) return null;

  const convId = chat.chat_id ? jaiId("conv", chat.chat_id) : uid();
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
    const messageId = m.id ? jaiId("msg", m.id) : uid();
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
      id: jaiId("item", messageId),
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

// JanitorAI entries use the singular `key`/`keysecondary`; the shared lorebook
// parser speaks CCv3, so they are renamed rather than parsed a second way.
async function writeLorebooks(character: JaiCharacter): Promise<string[]> {
  const ids: string[] = [];
  for (const book of character.lorebooks ?? []) {
    const raw = (book.entries ?? [])
      .map((e) => {
        const entry = rec(e);
        if (!entry) return null;
        const keys = Array.isArray(entry.key)
          ? entry.key
          : Array.isArray(entry.keys)
            ? entry.keys
            : [];
        if (typeof entry.content !== "string" || !entry.content) return null;
        return {
          keys: keys.filter((k): k is string => typeof k === "string"),
          secondary_keys: Array.isArray(entry.keysecondary)
            ? entry.keysecondary.filter(
                (k): k is string => typeof k === "string",
              )
            : undefined,
          content: entry.content,
          comment:
            typeof entry.comment === "string"
              ? entry.comment
              : typeof entry.name === "string"
                ? entry.name
                : undefined,
          enabled: entry.enabled !== false,
          constant: entry.constant === true,
          selective: !!entry.selectiveLogic,
          insertion_order:
            typeof entry.insertion_order === "number"
              ? entry.insertion_order
              : undefined,
        };
      })
      .filter((e) => e !== null);
    if (raw.length === 0) continue;

    const { parseLorebookJson } = await import("@/lib/ai/rp/lorebook-import");
    const parsed = parseLorebookJson({
      name: book.title || "Imported lorebook",
      scan_depth: book.scan_depth,
      entries: raw,
    });
    if (!parsed) continue;

    const lorebookId = book.id ? jaiId("lore", book.id) : uid();
    const now = dayjs().toDate();
    await upsertLocalLorebookBundle({
      lorebook: {
        id: lorebookId,
        name: parsed.name,
        description: parsed.description ?? null,
        // Both are NOT NULL with a default in the schema, so an absent value
        // has to fall back rather than be written as null.
        scanDepth: parsed.scanDepth ?? 4,
        tokenBudget: parsed.tokenBudget ?? 1500,
        recursiveScanning: parsed.recursiveScanning ?? false,
        createdAt: now,
        updatedAt: now,
      },
      entries: parsed.entries.map((e, i) => ({
        id: jaiId("entry", `${lorebookId}-${i}`),
        ...e,
      })),
    });
    ids.push(lorebookId);
  }
  return ids;
}

// The card is written even when its definition was hidden, because the name,
// description and greeting still came across; the recovered prompt goes to
// systemPrompt, which is where a flattened assembly belongs.
async function writeCharacter(character: JaiCharacter): Promise<string | null> {
  const card = character.card;
  if (!card) return null;
  const name = card.name?.trim() || character.character_name?.trim();
  if (!name) return null;
  const characterId = character.character_id
    ? jaiId("char", character.character_id)
    : uid();
  const now = dayjs().toDate();

  let avatarMediaId: string | null = null;
  const img = card.avatar_data;
  if (img?.base64) {
    avatarMediaId = jaiId("avatar", characterId);
    await upsertLocalMedia({
      id: avatarMediaId,
      convId: null,
      mimeType: img.mimeType ?? "image/png",
      sizeBytes: Math.floor((img.base64.length * 3) / 4),
      dataBase64: img.base64,
    });
  }

  await upsertLocalCharacter({
    id: characterId,
    name,
    avatarMediaId,
    description: card.description || null,
    personality: card.personality || null,
    scenario: card.scenario || null,
    firstMessage: card.first_mes || null,
    alternateGreetings: card.alternate_greetings?.length
      ? card.alternate_greetings
      : null,
    exampleMessages: card.mes_example || null,
    systemPrompt: card.assembled_prompt || null,
    postHistoryInstructions: null,
    defaultReasoningEffort: null,
    tags: card.tags?.length ? card.tags : null,
    triggers: null,
    alwaysActive: true,
    matchWholeWords: false,
    assets: null,
    createdAt: now,
    updatedAt: now,
  });
  return characterId;
}

export async function importJanitorAiExport(
  parsed: unknown,
): Promise<{ id: string; imported: number }> {
  const root = charactersMap(parsed);
  if (!root) throw new Error(msg("ERRORS.IMPORT_INVALID_JSON"));

  const chats: {
    convId: string;
    bundle: Parameters<typeof upsertLocalConversationBundle>[0];
  }[] = [];
  let cards = 0;
  let books = 0;
  for (const value of Object.values(root)) {
    const character = asCharacter(value);
    if (!character) continue;

    // Written before the conversations so each one can bind to them.
    const characterId = await writeCharacter(character);
    if (characterId) cards++;
    const lorebookIds = await writeLorebooks(character);
    books += lorebookIds.length;

    (character.chats ?? []).forEach((chat, i) => {
      const mapped = mapChat(character, chat, chats.length + i);
      if (!mapped) return;
      if (characterId) {
        mapped.bundle.conversationCharacters = [
          { convId: mapped.convId, characterId, orderIndex: 0, isActive: true },
        ];
      }
      mapped.bundle.conversationLorebooks = lorebookIds.map((id, n) => ({
        convId: mapped.convId,
        lorebookId: id,
        orderIndex: n,
        isActive: true,
      }));
      chats.push(mapped);
    });
  }

  if (chats.length === 0) throw new Error(msg("ERRORS.REQUEST_FAILED"));

  // Written one at a time rather than in a transaction: SQLocal's mutex
  // deadlocks every later call if one statement throws, and a partial import of
  // 600 chats is worth keeping.
  for (const chat of chats) {
    await upsertLocalConversationBundle(chat.bundle);
  }

  logChatDebug("import.janitorai.done", {
    conversations: chats.length,
    characters: cards,
    lorebooks: books,
  });
  return { id: chats[0].convId, imported: chats.length };
}
