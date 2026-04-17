import { QUOTA_PER_DOLLAR, msg } from "@/lib/config/constants";
import { downloadAndUpload, uploadBase64ToR2 } from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { uid, unwrap } from "@/lib/utils/base";
import dayjs from "dayjs";
import { logger } from "@/lib/utils/logger";
import type { PersistMessagesBody } from "@/lib/validation/chat";
import { getUserLogs } from "@/openapi";
import { serverEnv } from "@/server/env";
import { and, eq, sql } from "drizzle-orm";

export type PendingUsage = {
  requestId: string | undefined;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  upstreamHeaders?: Record<string, string>;
  rawResponse?: string;
  createdAt: number;
};

const PENDING_USAGE_TTL = 5 * 60 * 1000; // 5 minutes

export const pendingUsageByConv = new Map<string, PendingUsage>();

/** Remove stale entries that were never consumed (e.g. client disconnected). */
export function sweepStalePending() {
  const now = Date.now();
  for (const [key, value] of pendingUsageByConv) {
    if (now - value.createdAt > PENDING_USAGE_TTL) {
      pendingUsageByConv.delete(key);
    }
  }
}

const IMAGE_MD_RE = /!\[([^\]]*)\]\((data:[^)]+|https?:\/\/[^)]+)\)/g;
const TASK_CARD_RE = /^TASK_CARD:(\{.+\})$/;

/** Strip image generation metadata from text parts and re-upload images to R2. */
async function cleanImageParts(
  parts: { type: string; text?: string; [k: string]: unknown }[],
  convId: string,
  groupKey: string,
) {
  const r2Domain = serverEnv.r2PublicUrl ?? "";
  const cleaned = [];

  for (const part of parts) {
    if (part.type !== "text" || !part.text) {
      cleaned.push(part);
      continue;
    }

    // Detect task card sentinel and convert to a data-task part.
    // `data-*` parts survive the AI SDK ↔ assistant-ui round trip because the
    // converter (convertMessage.ts) emits them as {type:"data", name:"task"}
    // instead of dropping them like unknown types.
    const taskMatch = part.text.trim().match(TASK_CARD_RE);
    if (taskMatch) {
      try {
        const payload = JSON.parse(taskMatch[1]) as Record<string, unknown>;
        cleaned.push({ type: "data-task", data: payload });
        continue;
      } catch {
        // Malformed sentinel, fall through to normal text handling
      }
    }

    const matches = [...part.text.matchAll(IMAGE_MD_RE)];
    if (matches.length === 0) {
      cleaned.push(part);
      continue;
    }

    const needsProcessing = matches.some(
      ([, , url]) =>
        url.startsWith("data:") ||
        (url.startsWith("http") && r2Domain && !url.startsWith(r2Domain)),
    );
    if (!needsProcessing) {
      cleaned.push(part);
      continue;
    }

    const imageMarkdowns: string[] = [];
    for (const [, alt, url] of matches) {
      try {
        let r2Url: string;
        if (url.startsWith("data:")) {
          r2Url = await uploadBase64ToR2(url, convId, groupKey);
        } else {
          r2Url = await downloadAndUpload(url, convId, groupKey);
        }
        imageMarkdowns.push(`![${alt}](${r2Url})`);
      } catch (err) {
        logger.warn("Image upload to R2 failed, keeping original URL", {
          context: "message.images",
          url: url.slice(0, 100),
          error: String(err),
        });
        imageMarkdowns.push(`![${alt}](${url})`);
      }
    }
    cleaned.push({ ...part, text: imageMarkdowns.join("\n\n") });
  }

  return cleaned;
}

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

  // Clean image generation metadata and re-upload external/base64 images to R2
  const groupKey = uid(8);
  const processedMsgs = await Promise.all(
    msgs.map(async (m) => {
      if (m.role !== "assistant") return m;
      return { ...m, parts: await cleanImageParts(m.parts, convId, groupKey) };
    }),
  );

  const now = dayjs();
  const toInsert = processedMsgs.map((m, i) => ({
    convId,
    role: m.role,
    model: m.model,
    parts: m.parts,
    createdAt: now.add(i, "millisecond").toDate(),
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
  const assistantIdx = toInsert.findLastIndex((m) => m.role === "assistant");
  if (assistantIdx !== -1 && inserted[assistantIdx]) {
    // Claim and remove immediately so concurrent calls see nothing
    const pending = pendingUsageByConv.get(convId);
    if (pending) {
      pendingUsageByConv.delete(convId);

      // If cost lookup hasn't completed yet, do it here
      if (pending.cost === 0 && pending.requestId && pending.upstreamHeaders) {
        try {
          const logRes = await getUserLogs(
            { request_id: pending.requestId, type: 2, page_size: 1 },
            { headers: pending.upstreamHeaders },
          );
          const quota = unwrap(logRes).data?.items?.[0]?.quota ?? 0;
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
          rawResponse: pending.rawResponse,
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
  const updates: Record<string, unknown> = { updatedAt: dayjs().toDate() };
  if (!conv.title && msgs.length > 0) {
    const firstUserMsg = msgs.find((m) => m.role === "user");
    if (firstUserMsg) {
      const textPart = firstUserMsg.parts.find(
        (p): p is { type: "text"; text: string } => p.type === "text",
      );
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
