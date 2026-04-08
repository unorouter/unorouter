import { msg } from "@/lib/config/constants";
import { deleteR2Prefix } from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import type {
  ChatSearchQuery,
  CreateConversationBody,
  UpdateConversationBody,
} from "@/lib/validation/chat";
import { and, desc, eq, inArray, like, sql } from "drizzle-orm";

export async function getPaginatedMessages(
  convId: string,
  query: { p?: number; page_size?: number },
) {
  const db = getDb();
  const page = query.p ?? 1;
  const pageSize = query.page_size ?? 20;
  const offset = (page - 1) * pageSize;

  const [msgs, countResult] = await Promise.all([
    db
      .select()
      .from(messages)
      .where(eq(messages.convId, convId))
      .orderBy(sql`${messages.createdAt} DESC, rowid DESC`)
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.convId, convId)),
  ]);

  return {
    messages: msgs.reverse(),
    totalMessages: countResult[0]?.count ?? 0,
  };
}

export async function listConversations(
  userId: number,
  query: ChatSearchQuery,
  guestConvIds: string[],
) {
  const db = getDb();
  const page = query.p ?? 1;
  const pageSize = query.page_size ?? 20;
  const offset = (page - 1) * pageSize;
  const keyword = query.keyword?.trim();

  const isGuest = userId === 0 && guestConvIds.length > 0;

  // Anonymous user with no stored conv IDs: nothing to list
  if (userId === 0 && !isGuest)
    return { items: [], total: 0, page, pageSize };

  const conditions = isGuest
    ? [inArray(conversations.id, guestConvIds), eq(conversations.userId, 0)]
    : [eq(conversations.userId, userId)];

  if (keyword) {
    conditions.push(like(conversations.title, `%${keyword}%`));
  }
  const where = and(...conditions);

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: conversations.id,
        title: conversations.title,
        model: conversations.model,
        shareId: conversations.shareId,
        totalCost: conversations.totalCost,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
      })
      .from(conversations)
      .where(where)
      .orderBy(desc(conversations.updatedAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(where),
  ]);

  return { items, total: countResult[0]?.count ?? 0, page, pageSize };
}

export async function createConversation(
  userId: number,
  body: CreateConversationBody,
) {
  const db = getDb();
  const id = body.id ?? uid();
  const now = new Date();

  await db.insert(conversations).values({
    id,
    userId,
    title: body.title ?? null,
    model: body.model,
    createdAt: now,
    updatedAt: now,
  });

  return { id, model: body.model, title: body.title ?? null };
}

export async function getConversation(userId: number, convId: string) {
  const db = getDb();
  const conv = await db.query.conversations.findFirst({
    where: and(eq(conversations.id, convId), eq(conversations.userId, userId)),
  });
  if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));
  return conv;
}

export async function updateConversation(
  userId: number,
  convId: string,
  body: UpdateConversationBody,
) {
  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.model !== undefined) updates.model = body.model;

  const result = await db
    .update(conversations)
    .set(updates)
    .where(
      and(eq(conversations.id, convId), eq(conversations.userId, userId)),
    )
    .returning({ id: conversations.id });

  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return { id: convId, title: body.title, model: body.model };
}

export async function deleteConversation(userId: number, convId: string) {
  const db = getDb();
  const conv = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, convId),
      eq(conversations.userId, userId),
    ),
  });
  if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

  deleteR2Prefix(`chat/${convId}/`).catch(() => {});
  await db.delete(conversations).where(eq(conversations.id, conv.id));

  return { id: convId };
}

export async function createShareLink(userId: number, convId: string) {
  const db = getDb();
  const shareId = uid(12);

  const result = await db
    .update(conversations)
    .set({ shareId })
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id });

  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return { shareId };
}

export async function revokeShareLink(userId: number, convId: string) {
  const db = getDb();
  const result = await db
    .update(conversations)
    .set({ shareId: null })
    .where(and(eq(conversations.id, convId), eq(conversations.userId, userId)))
    .returning({ id: conversations.id });

  if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
  return { id: convId };
}

export async function getSharedConversation(
  shareId: string,
  query: { p?: number; page_size?: number },
) {
  const db = getDb();
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.shareId, shareId),
  });
  if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

  const paginated = await getPaginatedMessages(conv.id, query);
  return {
    id: conv.id,
    title: conv.title,
    model: conv.model,
    createdAt: conv.createdAt,
    totalInputTokens: conv.totalInputTokens ?? 0,
    totalOutputTokens: conv.totalOutputTokens ?? 0,
    totalCost: conv.totalCost ?? 0,
    ...paginated,
  };
}

/** Get a conversation by ID, allowing access if the user owns it OR if it has a shareId (public). */
export async function getConversationOrShared(
  userId: number,
  convId: string,
) {
  const db = getDb();
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, convId),
  });
  if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));
  // Allow if user owns it, if it's an anonymous conv, or if it's publicly shared
  if (conv.userId !== userId && conv.userId !== 0 && !conv.shareId)
    throw new Error(msg("ERRORS.NOT_FOUND"));
  return conv;
}

/** Transfer anonymous conversations (userId=0) to a real user account. */
export async function claimConversations(userId: number, convIds: string[]) {
  if (convIds.length === 0) return { claimed: 0 };
  const db = getDb();
  const result = await db
    .update(conversations)
    .set({ userId, updatedAt: new Date() })
    .where(
      and(eq(conversations.userId, 0), inArray(conversations.id, convIds)),
    )
    .returning({ id: conversations.id });
  return { claimed: result.length };
}
