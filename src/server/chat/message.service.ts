import {
  PENDING_USAGE_TTL_MS,
  QUOTA_PER_DOLLAR,
  msg,
} from "@/lib/config/constants";
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

export const pendingUsageByConv = new Map<string, PendingUsage>();

/** Remove stale entries that were never consumed (e.g. client disconnected). */
export function sweepStalePending() {
  const now = Date.now();
  for (const [key, value] of pendingUsageByConv) {
    if (now - value.createdAt > PENDING_USAGE_TTL_MS) {
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
    ...(m.id ? { id: m.id } : {}),
    convId,
    parentId: m.parentId ?? null,
    role: m.role,
    model: m.model,
    parts: m.parts,
    createdAt: now.add(i, "millisecond").toDate(),
  }));

  // Claim pending usage and resolve cost BEFORE opening the transaction so the
  // upstream getUserLogs network call doesn't hold the SQLite write lock.
  const assistantIdx = toInsert.findLastIndex((m) => m.role === "assistant");
  let usage: PendingUsage | undefined;
  if (assistantIdx !== -1) {
    const pending = pendingUsageByConv.get(convId);
    if (pending) {
      pendingUsageByConv.delete(convId);

      if (pending.cost === 0 && pending.requestId && pending.upstreamHeaders) {
        try {
          const logRes = await getUserLogs(
            { request_id: pending.requestId, type: 2, page_size: 1 },
            { headers: pending.upstreamHeaders },
          );
          const quota = unwrap(logRes).data?.items?.[0]?.quota ?? 0;
          pending.cost = quota / QUOTA_PER_DOLLAR;
        } catch (err) {
          logger.warn("Cost lookup failed, continuing with tokens only", {
            context: "chat.message.costLookup",
            err,
            convId,
            requestId: pending.requestId,
          });
        }
      }

      usage = pending;
    }
  }

  // Build conversation update payload (timestamp + auto-title from first user message)
  const convUpdates: Record<string, unknown> = { updatedAt: dayjs().toDate() };
  if (!conv.title && msgs.length > 0) {
    const firstUserMsg = msgs.find((m) => m.role === "user");
    if (firstUserMsg) {
      const textPart = firstUserMsg.parts.find(
        (p): p is { type: "text"; text: string } => p.type === "text",
      );
      if (textPart?.text) {
        convUpdates.title = textPart.text.slice(0, 100);
      }
    }
  }

  const inserted = await db.transaction(async (tx) => {
    const ids =
      toInsert.length > 0
        ? await tx
            .insert(messages)
            .values(toInsert)
            .returning({ id: messages.id })
        : [];

    if (usage && assistantIdx !== -1 && ids[assistantIdx]) {
      await tx
        .update(messages)
        .set({
          requestId: usage.requestId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cost: usage.cost,
          rawResponse: usage.rawResponse,
        })
        .where(eq(messages.id, ids[assistantIdx].id));

      await tx
        .update(conversations)
        .set({
          totalInputTokens: sql`${conversations.totalInputTokens} + ${usage.inputTokens}`,
          totalOutputTokens: sql`${conversations.totalOutputTokens} + ${usage.outputTokens}`,
          totalCost: sql`${conversations.totalCost} + ${usage.cost}`,
        })
        .where(eq(conversations.id, convId));
    }

    await tx
      .update(conversations)
      .set(convUpdates)
      .where(eq(conversations.id, convId));

    return ids;
  });

  return {
    ids: inserted.map((m) => m.id),
    title: convUpdates.title as string | undefined,
    usage: usage
      ? {
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cost: usage.cost,
        }
      : undefined,
  };
}
