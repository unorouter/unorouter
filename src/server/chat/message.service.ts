import {
  PENDING_USAGE_TTL_MS,
  QUOTA_PER_DOLLAR,
  msg,
} from "@/lib/config/constants";
import { downloadAndUpload, uploadBase64ToR2 } from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import { conversations, messageItems, messages } from "@/lib/db/schema";
import { uid, unwrap } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import type {
  PersistMessageItem,
  PersistMessagesBody,
} from "@/lib/validation/chat";
import { getUserLogs } from "@/openapi";
import { serverEnv } from "@/server/env";
import dayjs from "dayjs";
import { and, eq, inArray, sql } from "drizzle-orm";

export type PendingUsage = {
  requestId: string | undefined;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  durationMs?: number;
  tokensPerSecond?: number;
  upstreamHeaders?: Record<string, string>;
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

// ---------------------------------------------------------------------------
// Image rehosting: re-upload assistant-generated image markdown to R2
// ---------------------------------------------------------------------------

const IMAGE_MD_RE = /!\[([^\]]*)\]\((data:[^)]+|https?:\/\/[^)]+)\)/g;

/** Re-upload data: or external image URLs found in text-item content to R2. */
async function rehostTextItemImages(
  items: PersistMessageItem[],
  convId: string,
  groupKey: string,
): Promise<PersistMessageItem[]> {
  const r2Domain = serverEnv.r2PublicUrl ?? "";
  const out: PersistMessageItem[] = [];

  for (const item of items) {
    if (item.type !== "text") {
      out.push(item);
      continue;
    }

    const text = item.data.text;
    const matches = [...text.matchAll(IMAGE_MD_RE)];
    if (matches.length === 0) {
      out.push(item);
      continue;
    }

    const needsProcessing = matches.some(
      ([, , url]) =>
        url.startsWith("data:") ||
        (url.startsWith("http") && r2Domain && !url.startsWith(r2Domain)),
    );
    if (!needsProcessing) {
      out.push(item);
      continue;
    }

    const rewritten: string[] = [];
    for (const [, alt, url] of matches) {
      try {
        let r2Url: string;
        if (url.startsWith("data:")) {
          r2Url = await uploadBase64ToR2(url, convId, groupKey);
        } else {
          r2Url = await downloadAndUpload(url, convId, groupKey);
        }
        rewritten.push(`![${alt}](${r2Url})`);
      } catch (err) {
        logger.warn("Image upload to R2 failed, keeping original URL", {
          context: "message.images",
          url: url.slice(0, 100),
          error: String(err),
        });
        rewritten.push(`![${alt}](${url})`);
      }
    }
    out.push({ ...item, data: { ...item.data, text: rewritten.join("\n\n") } });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Persist messages
// ---------------------------------------------------------------------------

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

  // Clean assistant-image data: URLs / external URLs into R2
  const groupKey = uid(8);
  const processedMsgs = await Promise.all(
    msgs.map(async (m) => {
      if (m.role !== "assistant") return m;
      return {
        ...m,
        items: await rehostTextItemImages(m.items, convId, groupKey),
      };
    }),
  );

  const now = dayjs();
  const messageRows = processedMsgs.map((m, i) => ({
    ...(m.id ? { id: m.id } : { id: uid() }),
    convId,
    parentId: m.parentId ?? null,
    characterId: m.characterId ?? null,
    role: m.role,
    model: m.model ?? null,
    createdAt: now.add(i, "millisecond").toDate(),
    updatedAt: now.add(i, "millisecond").toDate(),
  }));

  // Claim pending usage and resolve cost BEFORE the transaction
  const assistantIdx = messageRows.findLastIndex((m) => m.role === "assistant");
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

  const convUpdates: Record<string, unknown> = { updatedAt: dayjs().toDate() };
  if (!conv.title && msgs.length > 0) {
    const firstUserMsg = msgs.find((m) => m.role === "user");
    if (firstUserMsg) {
      const textItem = firstUserMsg.items.find(
        (it): it is PersistMessageItem & { type: "text" } => it.type === "text",
      );
      if (textItem) {
        convUpdates.title = textItem.data.text.slice(0, 100);
      }
    }
  }

  const insertedIds = await db.transaction(async (tx) => {
    if (messageRows.length === 0) return [] as { id: string }[];

    // For each unique parentId in this batch, look up the highest existing
    // branchIndex among current siblings and remember which sibling ids are
    // currently active. We'll bump prior siblings to inactive and assign
    // monotonic branchIndex values to the new rows below.
    const parentIds = Array.from(
      new Set(
        messageRows.map((r) => r.parentId).filter((x): x is string => !!x),
      ),
    );

    const nextBranchIndexByParent = new Map<string, number>();
    const parentsToDeactivate = new Set<string>();
    if (parentIds.length > 0) {
      const existingSiblings = await tx
        .select({
          parentId: messages.parentId,
          branchIndex: messages.branchIndex,
          isActiveBranch: messages.isActiveBranch,
        })
        .from(messages)
        .where(
          and(
            eq(messages.convId, convId),
            inArray(messages.parentId, parentIds),
          ),
        );
      for (const sib of existingSiblings) {
        if (!sib.parentId) continue;
        const cur = nextBranchIndexByParent.get(sib.parentId) ?? -1;
        if (sib.branchIndex > cur)
          nextBranchIndexByParent.set(sib.parentId, sib.branchIndex);
        if (sib.isActiveBranch) parentsToDeactivate.add(sib.parentId);
      }
    }

    // Assign branchIndex per row: existing-max + 1 for the first new sibling,
    // then increments for any further siblings in the same batch.
    const rowsWithBranch = messageRows.map((row) => {
      if (!row.parentId) {
        return { ...row, branchIndex: 0, isActiveBranch: true };
      }
      const cur = nextBranchIndexByParent.get(row.parentId) ?? -1;
      const next = cur + 1;
      nextBranchIndexByParent.set(row.parentId, next);
      return { ...row, branchIndex: next, isActiveBranch: true };
    });

    // Flip prior active siblings off so the newly inserted row(s) become the
    // active branch tip. Per parent, only the last new sibling stays active.
    if (parentsToDeactivate.size > 0) {
      await tx
        .update(messages)
        .set({ isActiveBranch: false })
        .where(
          and(
            eq(messages.convId, convId),
            inArray(messages.parentId, Array.from(parentsToDeactivate)),
            eq(messages.isActiveBranch, true),
          ),
        );
    }
    // If the batch contains multiple siblings under the same parentId, only
    // the highest-branchIndex one should remain active.
    const finalActiveIdByParent = new Map<string, string>();
    for (const row of rowsWithBranch) {
      if (!row.parentId) continue;
      finalActiveIdByParent.set(row.parentId, row.id);
    }

    const ids = await tx
      .insert(messages)
      .values(rowsWithBranch)
      .returning({ id: messages.id });

    // Deactivate any in-batch sibling that isn't the final active per parent.
    const toDeactivateIds = rowsWithBranch
      .filter(
        (r) => r.parentId && finalActiveIdByParent.get(r.parentId) !== r.id,
      )
      .map((r) => r.id);
    if (toDeactivateIds.length > 0) {
      await tx
        .update(messages)
        .set({ isActiveBranch: false })
        .where(inArray(messages.id, toDeactivateIds));
    }

    // Insert items for each message
    const itemRows: (typeof messageItems.$inferInsert)[] = [];
    for (let i = 0; i < processedMsgs.length; i++) {
      const m = processedMsgs[i];
      const messageId = ids[i].id;
      m.items.forEach((it, seq) => {
        itemRows.push({
          ...(it.id ? { id: it.id } : { id: uid() }),
          messageId,
          sequenceIndex: seq,
          outputIndex: it.output_index ?? null,
          type: it.type,
          data: it.data,
        });
      });
    }
    if (itemRows.length > 0) {
      await tx.insert(messageItems).values(itemRows);
    }

    if (usage && assistantIdx !== -1 && ids[assistantIdx]) {
      await tx
        .update(messages)
        .set({
          generationId: usage.requestId,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cost: usage.cost,
          durationMs: usage.durationMs,
          tokensPerSecond: usage.tokensPerSecond,
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
    ids: insertedIds.map((m) => m.id),
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

// ---------------------------------------------------------------------------
// Branch helpers
// ---------------------------------------------------------------------------

/**
 * Mark a single sibling as the active branch for its parent. Used when the
 * user picks a different sibling via the BranchPicker arrows.
 */
export async function setActiveBranch(
  userId: number,
  convId: string,
  messageId: string,
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const ownership = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, convId), eq(conversations.userId, userId)),
      )
      .limit(1);
    if (ownership.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    const target = await tx
      .select({ parentId: messages.parentId })
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.convId, convId)))
      .limit(1);
    if (target.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
    const parentId = target[0].parentId;

    await tx
      .update(messages)
      .set({ isActiveBranch: false })
      .where(
        and(
          eq(messages.convId, convId),
          parentId
            ? eq(messages.parentId, parentId)
            : sql`${messages.parentId} IS NULL`,
        ),
      );
    await tx
      .update(messages)
      .set({ isActiveBranch: true, updatedAt: dayjs().toDate() })
      .where(eq(messages.id, messageId));

    return { id: messageId };
  });
}

/**
 * Edit a message's items in place. If `regenerate` is true, the caller is
 * expected to follow up with a new stream call; here we only update content.
 */
export async function editMessageItems(
  userId: number,
  convId: string,
  messageId: string,
  items: PersistMessageItem[],
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const ownership = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, convId), eq(conversations.userId, userId)),
      )
      .limit(1);
    if (ownership.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    const exists = await tx
      .select({ id: messages.id })
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.convId, convId)))
      .limit(1);
    if (exists.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    await tx.delete(messageItems).where(eq(messageItems.messageId, messageId));

    if (items.length > 0) {
      await tx.insert(messageItems).values(
        items.map((it, seq) => ({
          ...(it.id ? { id: it.id } : { id: uid() }),
          messageId,
          sequenceIndex: seq,
          outputIndex: it.output_index ?? null,
          type: it.type,
          data: it.data,
        })),
      );
    }

    await tx
      .update(messages)
      .set({ isEdited: true, updatedAt: dayjs().toDate() })
      .where(eq(messages.id, messageId));

    return { id: messageId };
  });
}

/**
 * Splice-delete a message: rewire its children's parentId to the deleted
 * message's parent, then drop the message + its items. Sibling messages on
 * the deleted message's parent are NOT touched (preserves retry-branches).
 *
 * The branch tree stays connected: every child of the deleted node now
 * points at the deleted node's parent and keeps its own branchIndex /
 * isActiveBranch as-is. The history adapter recomputes the active path
 * from there.
 */
export async function deleteMessage(
  userId: number,
  convId: string,
  messageId: string,
) {
  const db = getDb();

  return db.transaction(async (tx) => {
    const ownership = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, convId), eq(conversations.userId, userId)),
      )
      .limit(1);
    if (ownership.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    const target = await tx
      .select({ id: messages.id, parentId: messages.parentId })
      .from(messages)
      .where(and(eq(messages.id, messageId), eq(messages.convId, convId)))
      .limit(1);
    if (target.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

    const newParentId = target[0].parentId;

    // Rewire children to skip over the deleted node.
    await tx
      .update(messages)
      .set({ parentId: newParentId, updatedAt: dayjs().toDate() })
      .where(eq(messages.parentId, messageId));

    await tx.delete(messageItems).where(eq(messageItems.messageId, messageId));
    await tx.delete(messages).where(eq(messages.id, messageId));

    return { id: messageId };
  });
}
