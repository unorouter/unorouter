import { QUOTA_PER_DOLLAR, msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import type { PersistMessagesBody } from "@/lib/validation/chat";
import { getUserLogs } from "@/openapi";
import { and, eq, sql } from "drizzle-orm";

export type PendingUsage = {
  requestId: string | undefined;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  upstreamHeaders?: Record<string, string>;
};

export const pendingUsageByConv = new Map<string, PendingUsage>();

export async function persistMessages(
  userId: number,
  convId: string,
  msgs: PersistMessagesBody["messages"],
) {
  const db = getDb();

  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, convId), eq(conversations.userId, userId)),
  });
  if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

  const now = Date.now();
  const toInsert = msgs.map((m, i) => ({
    convId,
    role: m.role,
    model: m.model,
    parts: m.parts,
    createdAt: new Date(now + i),
  }));

  let inserted: { id: string }[] = [];
  if (toInsert.length > 0) {
    inserted = await db
      .insert(messages)
      .values(toInsert)
      .returning({ id: messages.id });
  }

  // Apply buffered usage data from stream onFinish to the last assistant message
  let usage: PendingUsage | undefined;
  const pending = pendingUsageByConv.get(convId);
  if (pending) {
    const assistantIdx = toInsert.findLastIndex((m) => m.role === "assistant");
    if (assistantIdx !== -1 && inserted[assistantIdx]) {
      pendingUsageByConv.delete(convId);

      // If cost lookup hasn't completed yet, do it here
      if (pending.cost === 0 && pending.requestId && pending.upstreamHeaders) {
        try {
          const logRes = await getUserLogs(
            { request_id: pending.requestId, type: 2, page_size: 1 },
            { headers: pending.upstreamHeaders },
          );
          const quota = logRes.data!.data?.items?.[0]?.quota ?? 0;
          pending.cost = quota / QUOTA_PER_DOLLAR;
        } catch {
          // Cost lookup failed, continue with tokens only
        }
      }

      usage = pending;
      await db
        .update(messages)
        .set({
          requestId: pending.requestId,
          inputTokens: pending.inputTokens,
          outputTokens: pending.outputTokens,
          cost: pending.cost,
        })
        .where(eq(messages.id, inserted[assistantIdx].id));

      // Update conversation totals
      await db
        .update(conversations)
        .set({
          totalInputTokens: sql`${conversations.totalInputTokens} + ${pending.inputTokens}`,
          totalOutputTokens: sql`${conversations.totalOutputTokens} + ${pending.outputTokens}`,
          totalCost: sql`${conversations.totalCost} + ${pending.cost}`,
        })
        .where(eq(conversations.id, convId));
    }
  }

  // Update conversation timestamp and title if first message
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (!conv.title && msgs.length > 0) {
    const firstUserMsg = msgs.find((m) => m.role === "user");
    if (firstUserMsg) {
      const textPart = (
        firstUserMsg.parts as { type: string; text?: string }[]
      ).find((p) => p.type === "text");
      if (textPart?.text) {
        updates.title = textPart.text.slice(0, 100);
      }
    }
  }

  await db
    .update(conversations)
    .set(updates)
    .where(eq(conversations.id, convId));

  return {
    ids: inserted.map((m) => m.id),
    title: updates.title as string | undefined,
    usage: usage
      ? {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cost: usage.cost,
        }
      : undefined,
  };
}
