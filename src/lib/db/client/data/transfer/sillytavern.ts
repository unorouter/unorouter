"use client";

import { msg } from "@/lib/config/constants";
import type { StMessage, StMetadata } from "@/lib/types/transfer";
import { dayjs } from "@/lib/utils/format/date";
import { readLocalConversationBundle } from "../chat";
import { upsertLocalConversationBundle } from "../chat";
import { mapStImport, parseStJsonl } from "./map";

type ConversationBundle = NonNullable<
  Awaited<ReturnType<typeof readLocalConversationBundle>>
>;
type MessageRow = ConversationBundle["messages"][number];
type MessageItemRow = ConversationBundle["messageItems"][number];

// Linear active branch: follow parentId from the last active-branch tip.
function walkActiveBranch(messages: MessageRow[], items: MessageItemRow[]) {
  const itemsByMsg = new Map<string, MessageItemRow[]>();
  for (const it of items) {
    const arr = itemsByMsg.get(it.messageId) ?? [];
    arr.push(it);
    itemsByMsg.set(it.messageId, arr);
  }
  for (const arr of itemsByMsg.values()) {
    arr.sort((a, b) => a.sequenceIndex - b.sequenceIndex);
  }

  const ordered = [...messages].sort(
    (a, b) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
  );
  const byId = new Map(ordered.map((m) => [m.id, m]));
  const tip = [...ordered].reverse().find((m) => m.isActiveBranch !== false);
  const path: MessageRow[] = [];
  let cur = tip;
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return { path, itemsByMsg, tipId: tip?.id };
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
  const bundle = await readLocalConversationBundle(userId, convId);
  if (!bundle) throw new Error(msg("ERRORS.NOT_FOUND"));

  const conv = bundle.conversation;
  const { path, itemsByMsg, tipId } = walkActiveBranch(
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
      | { text?: string }
      | undefined;

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

  const slug =
    (conv.title ?? "chat").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 60) ||
    "chat";
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
  return { id: mapped.convId };
}
