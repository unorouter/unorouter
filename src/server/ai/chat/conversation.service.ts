import { msg } from "@/lib/config/constants";
import { assertFound } from "@/lib/utils/server";
import { getDb } from "@/lib/db/server/client";
import {
  conversationSettings,
  conversations,
  messageItems,
  messages,
} from "@/lib/db/schema";
import { asc, eq, inArray } from "drizzle-orm";

export async function getConversation(userId: number, convId: string) {
  const db = getDb();
  const rows = await db
    .select({
      id: conversations.id,
      userId: conversations.userId,
      title: conversations.title,
      totalInputTokens: conversations.totalInputTokens,
      totalOutputTokens: conversations.totalOutputTokens,
      totalCost: conversations.totalCost,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
      model: conversationSettings.defaultModel,
    })
    .from(conversations)
    .leftJoin(
      conversationSettings,
      eq(conversationSettings.convId, conversations.id),
    )
    .where(eq(conversations.id, convId))
    .limit(1);
  assertFound(rows);
  const conv = rows[0];
  if (conv.userId !== userId) throw new Error(msg("ERRORS.NOT_FOUND"));
  return conv;
}

async function walkActiveBranch(convId: string) {
  const db = getDb();

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.convId, convId))
    .orderBy(asc(messages.createdAt));

  const itemRows =
    msgRows.length > 0
      ? await db
          .select()
          .from(messageItems)
          .where(
            inArray(
              messageItems.messageId,
              msgRows.map((m) => m.id),
            ),
          )
          .orderBy(asc(messageItems.messageId), asc(messageItems.sequenceIndex))
      : [];

  const itemsByMsg = new Map<string, typeof itemRows>();
  for (const it of itemRows) {
    const arr = itemsByMsg.get(it.messageId) ?? [];
    arr.push(it);
    itemsByMsg.set(it.messageId, arr);
  }

  const byId = new Map(msgRows.map((m) => [m.id, m]));
  const tip = [...msgRows].reverse().find((m) => m.isActiveBranch !== false);
  const path: typeof msgRows = [];
  let cur = tip;
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }

  return { path, itemsByMsg, tipId: tip?.id };
}

export async function getConversationMarkdown(userId: number, convId: string) {
  const db = getDb();

  const convRows = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, convId))
    .limit(1);
  assertFound(convRows);
  const conv = convRows[0];
  if (conv.userId !== userId && conv.userId !== 0)
    throw new Error(msg("ERRORS.NOT_FOUND"));

  const { path, itemsByMsg } = await walkActiveBranch(convId);

  const lines: string[] = [];
  if (conv.title) lines.push(`# ${conv.title}`, "");

  for (const m of path) {
    const items = itemsByMsg.get(m.id) ?? [];
    const heading =
      m.role === "user"
        ? "## User"
        : m.role === "assistant"
          ? m.model
            ? `## Assistant (${m.model})`
            : "## Assistant"
          : `## ${m.role.charAt(0).toUpperCase()}${m.role.slice(1)}`;
    lines.push(heading, "");

    for (const it of items) {
      const data = it.data as Record<string, unknown>;
      if (it.type === "text") {
        const text = typeof data.text === "string" ? data.text : "";
        if (text) lines.push(text, "");
      } else if (it.type === "reasoning") {
        const text = typeof data.text === "string" ? data.text : "";
        if (text) {
          lines.push("> _Reasoning:_", "");
          for (const ln of text.split("\n")) lines.push(`> ${ln}`);
          lines.push("");
        }
      } else if (it.type === "tool_call") {
        const name = typeof data.tool_name === "string" ? data.tool_name : "";
        lines.push(`_Tool call:_ \`${name}\``, "");
      } else if (it.type === "tool_result") {
        lines.push(`_Tool result_`, "");
      } else if (it.type === "image" || it.type === "file") {
        const url = typeof data.url === "string" ? data.url : "";
        if (url) lines.push(`![${it.type}](${url})`, "");
      } else if (it.type === "task") {
        const taskId = typeof data.task_id === "string" ? data.task_id : "";
        lines.push(`_Task ${taskId}_`, "");
      }
    }
  }

  return { markdown: lines.join("\n").trimEnd() };
}
