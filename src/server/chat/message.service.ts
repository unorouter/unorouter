import { msg } from "@/lib/config/constants";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import type { PersistMessagesBody } from "@/lib/validation/chat";
import { and, eq } from "drizzle-orm";

type PendingUsage = {
  requestId: string | undefined;
  inputTokens: number;
  outputTokens: number;
  cost: number;
};

export const pendingUsageByConv = new Map<string, PendingUsage>();

export async function persistMessages(
  userId: number,
  convId: string,
  msgs: PersistMessagesBody["messages"],
) {
  const db = getDb();

  const conv = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, convId),
      eq(conversations.userId, userId),
    ),
  });
  if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

  const toInsert = msgs.map((m) => ({
    convId,
    role: m.role,
    model: m.model,
    parts: m.parts,
    createdAt: new Date(),
  }));

  let inserted: { id: string }[] = [];
  if (toInsert.length > 0) {
    inserted = await db
      .insert(messages)
      .values(toInsert)
      .returning({ id: messages.id });
  }

  // Apply buffered usage data from stream onFinish to the last assistant message
  const pending = pendingUsageByConv.get(convId);
  if (pending) {
    const assistantIdx = toInsert.findLastIndex(
      (m) => m.role === "assistant",
    );
    if (assistantIdx !== -1 && inserted[assistantIdx]) {
      pendingUsageByConv.delete(convId);
      await db
        .update(messages)
        .set({
          requestId: pending.requestId,
          inputTokens: pending.inputTokens,
          outputTokens: pending.outputTokens,
          cost: pending.cost,
        })
        .where(eq(messages.id, inserted[assistantIdx].id));
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
  };
}
