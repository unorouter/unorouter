/**
 * SillyTavern chat JSONL import + export.
 *
 * Format (per https://docs.sillytavern.app/usage/core-concepts/chatfilemanagement/
 * and the actively-used SillyTavern source `src/endpoints/chats.js`):
 *
 *   line 0: metadata
 *     {
 *       user_name: string,
 *       character_name: string,
 *       create_date: string (humanized),
 *       chat_metadata: { integrity, chatIdHash, ... }
 *     }
 *
 *   line N: message
 *     {
 *       name: string,
 *       is_user: boolean,
 *       is_system: boolean,
 *       send_date: string,
 *       mes: string,
 *       extra?: { reasoning?: string, token_count?: number, model?: string },
 *       swipe_id?: number,
 *       swipes?: string[],
 *       swipe_info?: Array<{ extra: {...} }>,
 *     }
 *
 * Used as the lingua franca by SillyTavern, Chub/Venus, Janitor.AI exporter
 * userscripts/extensions, and most other RP frontends.
 */

import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import {
  characters,
  conversationCharacters,
  conversations,
  conversationSettings,
  messageItems,
  messages,
  type MessageItem,
} from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { walkActiveBranch } from "../conversation.service";
import dayjs from "dayjs";
import { asc, eq } from "drizzle-orm";

type STMetadata = {
  user_name: string;
  character_name: string;
  create_date: string;
  chat_metadata?: Record<string, unknown>;
};

type STMessage = {
  name: string;
  is_user: boolean;
  is_system?: boolean;
  send_date: string;
  mes: string;
  extra?: {
    reasoning?: string;
    token_count?: number;
    model?: string;
    [k: string]: unknown;
  };
  swipe_id?: number;
  swipes?: string[];
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Render the active branch of a conversation as SillyTavern JSONL. Walks the
 * tree from the latest active tip back to the root and emits chronological
 * message lines, stripping only items that have no equivalent in the ST
 * format (file/image/task items become inline markdown links in the text).
 */
export async function exportConversationSillyTavern(
  userId: number,
  convId: string,
): Promise<{ data: string; filename: string }> {
  const db = getDb();

  const convRows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, convId))
    .limit(1);
  if (convRows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  const conv = convRows[0];
  if (conv.userId !== userId && conv.userId !== 0 && !conv.shareId)
    throw new Error(msg("ERRORS.NOT_FOUND"));

  // Bound character (the first active one) supplies `character_name`.
  const charBindings = await db
    .select({ characterId: conversationCharacters.characterId })
    .from(conversationCharacters)
    .where(eq(conversationCharacters.convId, convId))
    .orderBy(asc(conversationCharacters.orderIndex))
    .limit(1);
  const charRow =
    charBindings[0]?.characterId
      ? (
          await db
            .select({ name: characters.name })
            .from(characters)
            .where(eq(characters.id, charBindings[0].characterId))
            .limit(1)
        )[0]
      : undefined;

  const { path, itemsByMsg, tipId } = await walkActiveBranch(convId);

  const characterName = charRow?.name ?? "Assistant";
  const userName = "User";

  const metadata: STMetadata = {
    user_name: userName,
    character_name: characterName,
    create_date: humanizedDate(conv.createdAt ?? new Date()),
    chat_metadata: { chatIdHash: conv.id, lastInContextMessageId: tipId },
  };

  const lines: string[] = [JSON.stringify(metadata)];

  for (const m of path) {
    const items = (itemsByMsg.get(m.id) ?? []) as MessageItem[];
    const text = renderItemsAsText(items);
    if (m.role === "system") continue; // ST treats system rows separately
    const reasoning = items.find((it) => it.type === "reasoning")?.data as
      | { text?: string }
      | undefined;

    const line: STMessage = {
      name:
        m.role === "user"
          ? userName
          : m.role === "assistant"
            ? characterName
            : m.role,
      is_user: m.role === "user",
      is_system: false,
      send_date: humanizedDate(m.createdAt ?? new Date()),
      mes: text,
      extra: {
        ...(reasoning?.text ? { reasoning: reasoning.text } : {}),
        ...(m.outputTokens != null ? { token_count: m.outputTokens } : {}),
        ...(m.model ? { model: m.model } : {}),
      },
    };
    lines.push(JSON.stringify(line));
  }

  const slug =
    (conv.title ?? "chat").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) ||
    "chat";
  return {
    data: lines.join("\n") + "\n",
    filename: `${slug}.sillytavern.jsonl`,
  };
}

function renderItemsAsText(items: MessageItem[]): string {
  const parts: string[] = [];
  for (const it of items) {
    const data = it.data as Record<string, unknown>;
    if (it.type === "text" && typeof data.text === "string") {
      parts.push(data.text);
    } else if (it.type === "image" || it.type === "file") {
      const url = typeof data.url === "string" ? data.url : "";
      if (url) parts.push(`![${it.type}](${url})`);
    } else if (it.type === "task") {
      const tid = typeof data.task_id === "string" ? data.task_id : "";
      parts.push(`*[task ${tid}]*`);
    }
    // tool_call / tool_result / reasoning are intentionally not inlined into
    // `mes`; reasoning rides through `extra.reasoning`, tool calls have no
    // ST equivalent.
  }
  return parts.join("\n\n").trim();
}

function humanizedDate(d: Date): string {
  // ST's reader is permissive; ISO is round-trippable and consistent.
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Read a SillyTavern JSONL chat file and create a new conversation in the
 * caller's account. Each ST line becomes one message in our schema; user
 * messages are linked as parents of the next assistant message to form a
 * linear active branch (no swipes — we collapse to the active swipe only).
 */
export async function importSillyTavernChat(
  userId: number,
  file: File,
): Promise<{ id: string }> {
  const text = await file.text();
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) throw new Error(msg("ERRORS.REQUEST_FAILED"));

  let metadata: STMetadata | null = null;
  try {
    metadata = JSON.parse(lines[0]) as STMetadata;
  } catch {
    metadata = null;
  }

  // First line might be a message instead of metadata (some exporters skip
  // the metadata line). Detect by checking for `mes`/`is_user` shape.
  const messageLines: string[] = metadata?.user_name ? lines.slice(1) : lines;

  const stMessages: STMessage[] = [];
  for (const ln of messageLines) {
    try {
      const parsed = JSON.parse(ln) as STMessage;
      if (typeof parsed.mes === "string") stMessages.push(parsed);
    } catch {
      // skip malformed lines
    }
  }

  if (stMessages.length === 0) throw new Error(msg("ERRORS.REQUEST_FAILED"));

  const db = getDb();
  const newConvId = uid();
  const now = dayjs();
  const title =
    metadata?.character_name && metadata?.user_name
      ? `${metadata.character_name} (imported)`
      : "Imported chat";

  await db.transaction(async (tx) => {
    await tx.insert(conversations).values({
      id: newConvId,
      userId,
      title,
    });
    await tx.insert(conversationSettings).values({
      convId: newConvId,
      defaultModel: "",
    });

    let prevId: string | null = null;
    for (let i = 0; i < stMessages.length; i++) {
      const m = stMessages[i];
      const role = m.is_user ? "user" : m.is_system ? "system" : "assistant";
      const messageId = uid();
      const createdAt = parseStDate(m.send_date) ?? now.add(i, "ms").toDate();

      await tx.insert(messages).values({
        id: messageId,
        convId: newConvId,
        parentId: prevId,
        role,
        model: m.extra?.model ?? null,
        outputTokens: m.extra?.token_count ?? null,
        createdAt,
        updatedAt: createdAt,
      });

      const itemRows: Array<{
        id: string;
        messageId: string;
        sequenceIndex: number;
        outputIndex: number | null;
        type: string;
        data: Record<string, unknown>;
      }> = [];
      let seq = 0;

      if (m.extra?.reasoning) {
        itemRows.push({
          id: uid(),
          messageId,
          sequenceIndex: seq++,
          outputIndex: null,
          type: "reasoning",
          data: { text: m.extra.reasoning },
        });
      }
      if (m.mes) {
        itemRows.push({
          id: uid(),
          messageId,
          sequenceIndex: seq++,
          outputIndex: null,
          type: "text",
          data: { text: m.mes },
        });
      }

      if (itemRows.length > 0) await tx.insert(messageItems).values(itemRows);
      prevId = messageId;
    }
  });

  logger.info("Imported SillyTavern chat", {
    context: "chat.import.sillytavern",
    userId,
    convId: newConvId,
    messageCount: stMessages.length,
  });

  return { id: newConvId };
}

function parseStDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d;
  // Some ST exports use Unix epoch ms as a number-in-string.
  const n = Number(raw);
  if (!isNaN(n) && n > 0) return new Date(n);
  return null;
}

/**
 * Detect whether a JSON file looks like a SillyTavern chat export. Used by
 * the unified import endpoint to dispatch to this importer instead of the
 * native/orpg flow.
 */
export function looksLikeSillyTavernChat(text: string): boolean {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0);
  if (!firstLine) return false;
  try {
    const parsed = JSON.parse(firstLine.trim());
    return (
      (typeof parsed.user_name === "string" &&
        typeof parsed.character_name === "string") ||
      typeof parsed.mes === "string"
    );
  } catch {
    return false;
  }
}
