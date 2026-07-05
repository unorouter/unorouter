"use client";

import { joinItemsToMessages, walkActiveBranch } from "@/lib/ai/chat/messages";
import { msg } from "@/lib/config/constants";
import type { StMessage, StMetadata } from "@/lib/types";
import { exportSlug } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/format/date";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import {
  readLocalConversationBundle,
  upsertLocalConversationBundle,
} from "@/lib/db/client/data/chat/chat";
import { mapStImport, parseStJsonl } from "./map";

type ConversationBundle = NonNullable<
  Awaited<ReturnType<typeof readLocalConversationBundle>>
>;
type MessageRow = ConversationBundle["messages"][number];
type MessageItemRow = ConversationBundle["messageItems"][number];

function buildBranchView(messages: MessageRow[], items: MessageItemRow[]) {
  const joined = joinItemsToMessages(messages, items);
  const itemsByMsg = new Map<string, MessageItemRow[]>(
    joined.map((m) => [
      m.id,
      [...m.items].sort((a, b) => a.sequenceIndex - b.sequenceIndex),
    ]),
  );
  const ordered = [...messages].sort(
    (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
  );
  const { path, tipId } = walkActiveBranch(ordered);
  return { path, itemsByMsg, tipId };
}

function renderItemsAsText(items: MessageItemRow[]): string {
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
    // reasoning rides through extra.reasoning; tool calls have no ST equivalent.
  }
  return parts.join("\n\n").trim();
}

export async function exportLocalConversationSillyTavern(
  userId: number | undefined,
  convId: string,
): Promise<{ data: string; filename: string }> {
  logChatDebug("export.conv_sillytavern.start", { convId });
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) throw new Error(msg("ERRORS.NOT_FOUND"));

  const conv = bundle.conversation;
  const { path, itemsByMsg, tipId } = buildBranchView(
    bundle.messages,
    bundle.messageItems,
  );

  const characterName = bundle.characters[0]?.name ?? "Assistant";
  const userName = "User";

  const metadata: StMetadata = {
    user_name: userName,
    character_name: characterName,
    create_date: dayjs(conv.createdAt ?? undefined).toISOString(),
    chat_metadata: { chatIdHash: conv.id, lastInContextMessageId: tipId },
  };

  const lines: string[] = [JSON.stringify(metadata)];

  for (const m of path) {
    if (m.role === "system") continue;
    const items = itemsByMsg.get(m.id) ?? [];
    const text = renderItemsAsText(items);
    const reasoning = items.find((it) => it.type === "reasoning")?.data as
      { text?: string } | undefined;

    const line: StMessage = {
      name:
        m.role === "user"
          ? userName
          : m.role === "assistant"
            ? characterName
            : m.role,
      is_user: m.role === "user",
      is_system: false,
      send_date: dayjs(m.createdAt ?? undefined).toISOString(),
      mes: text,
      extra: {
        ...(reasoning?.text ? { reasoning: reasoning.text } : {}),
        ...(m.outputTokens != null ? { token_count: m.outputTokens } : {}),
        ...(m.model ? { model: m.model } : {}),
      },
    };
    lines.push(JSON.stringify(line));
  }

  const slug = exportSlug(conv.title ?? "chat", "chat");
  return {
    data: lines.join("\n") + "\n",
    filename: `${slug}.sillytavern.jsonl`,
  };
}

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

// Linear active branch; swipes collapsed to the active one.
export async function importSillyTavernChat(
  userId: number | undefined,
  text: string,
): Promise<{ id: string }> {
  const parsed = parseStJsonl(text);
  if (parsed.messages.length === 0) {
    throw new Error(msg("ERRORS.REQUEST_FAILED"));
  }
  const mapped = mapStImport(parsed, dayjs().toDate());
  await upsertLocalConversationBundle(userId, mapped.bundle);
  logChatDebug("import.sillytavern.done", {
    convId: mapped.convId,
    messages: parsed.messages.length,
  });
  return { id: mapped.convId };
}
