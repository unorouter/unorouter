import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { deleteR2Prefix } from "@/lib/storage/r2";
import { and, desc, eq, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { nanoid } from "nanoid";
import { deriveUpstream } from "../constants";

function getUserId(upstream: { headers: Record<string, string> }): number {
  const raw = upstream.headers["New-Api-User"];
  if (!raw) throw new Error("Unauthorized");
  return Number(raw);
}

export const chatRoute = new Elysia({ prefix: "/chat" })
  .derive(deriveUpstream)

  // List conversations for the authenticated user
  .get(
    "/",
    async ({ query, upstream }) => {
      const db = getDb();
      const userId = getUserId(upstream);
      const page = query.p ?? 1;
      const pageSize = query.page_size ?? 20;
      const offset = (page - 1) * pageSize;

      const [items, countResult] = await Promise.all([
        db
          .select({
            id: conversations.id,
            title: conversations.title,
            model: conversations.model,
            shareId: conversations.shareId,
            createdAt: conversations.createdAt,
            updatedAt: conversations.updatedAt,
          })
          .from(conversations)
          .where(eq(conversations.userId, userId))
          .orderBy(desc(conversations.updatedAt))
          .limit(pageSize)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(conversations)
          .where(eq(conversations.userId, userId)),
      ]);

      return {
        success: true,
        data: {
          items,
          total: countResult[0]?.count ?? 0,
          page,
          pageSize,
        },
      };
    },
    {
      query: t.Object({
        p: t.Optional(t.Numeric({ minimum: 1 })),
        page_size: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      }),
    },
  )

  // Create a new conversation
  .post(
    "/",
    async ({ body, upstream }) => {
      const db = getDb();
      const userId = getUserId(upstream);
      const id = nanoid();
      const now = new Date();

      await db.insert(conversations).values({
        id,
        userId,
        title: body.title ?? null,
        model: body.model,
        createdAt: now,
        updatedAt: now,
      });

      return {
        success: true,
        data: { id, model: body.model, title: body.title ?? null },
      };
    },
    {
      body: t.Object({
        model: t.String(),
        title: t.Optional(t.String()),
      }),
    },
  )

  // Get a single conversation with all messages
  .get("/:id", async ({ params, upstream }) => {
    const db = getDb();
    const userId = getUserId(upstream);

    const conv = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, params.id),
        eq(conversations.userId, userId),
      ),
    });
    if (!conv) throw new Error("Not found");

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.convId, params.id))
      .orderBy(messages.createdAt);

    return { success: true, data: { ...conv, messages: msgs } };
  })

  // Update conversation title
  .put(
    "/:id",
    async ({ params, body, upstream }) => {
      const db = getDb();
      const userId = getUserId(upstream);

      const result = await db
        .update(conversations)
        .set({ title: body.title, updatedAt: new Date() })
        .where(
          and(
            eq(conversations.id, params.id),
            eq(conversations.userId, userId),
          ),
        )
        .returning({ id: conversations.id });

      if (result.length === 0) throw new Error("Not found");
      return { success: true, data: { id: params.id, title: body.title } };
    },
    {
      body: t.Object({
        title: t.String(),
      }),
    },
  )

  // Delete a conversation (cascade deletes messages, cleanup R2)
  .delete("/:id", async ({ params, upstream }) => {
    const db = getDb();
    const userId = getUserId(upstream);

    const conv = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, params.id),
        eq(conversations.userId, userId),
      ),
    });
    if (!conv) throw new Error("Not found");

    // Cleanup R2 media for this conversation
    deleteR2Prefix(`chat/${params.id}/`).catch(() => {});

    await db
      .delete(conversations)
      .where(eq(conversations.id, params.id));

    return { success: true, data: { id: params.id } };
  })

  // Generate a share link
  .post("/:id/share", async ({ params, upstream }) => {
    const db = getDb();
    const userId = getUserId(upstream);
    const shareId = nanoid(12);

    const result = await db
      .update(conversations)
      .set({ shareId })
      .where(
        and(
          eq(conversations.id, params.id),
          eq(conversations.userId, userId),
        ),
      )
      .returning({ id: conversations.id });

    if (result.length === 0) throw new Error("Not found");
    return { success: true, data: { shareId } };
  })

  // Revoke share link
  .delete("/:id/share", async ({ params, upstream }) => {
    const db = getDb();
    const userId = getUserId(upstream);

    const result = await db
      .update(conversations)
      .set({ shareId: null })
      .where(
        and(
          eq(conversations.id, params.id),
          eq(conversations.userId, userId),
        ),
      )
      .returning({ id: conversations.id });

    if (result.length === 0) throw new Error("Not found");
    return { success: true, data: { id: params.id } };
  })

  // Public: get shared conversation (no auth required)
  .get(
    "/shared/:shareId",
    async ({ params }) => {
      const db = getDb();
      const conv = await db.query.conversations.findFirst({
        where: eq(conversations.shareId, params.shareId),
      });
      if (!conv) throw new Error("Not found");

      const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.convId, conv.id))
        .orderBy(messages.createdAt);

      return {
        success: true,
        data: {
          id: conv.id,
          title: conv.title,
          model: conv.model,
          createdAt: conv.createdAt,
          messages: msgs,
        },
      };
    },
  )

  // Persist messages for a conversation
  .post(
    "/:id/messages",
    async ({ params, body, upstream }) => {
      const db = getDb();
      const userId = getUserId(upstream);

      // Verify ownership
      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, params.id),
          eq(conversations.userId, userId),
        ),
      });
      if (!conv) throw new Error("Not found");

      const toInsert = body.messages.map((msg) => ({
        id: msg.id ?? nanoid(),
        convId: params.id,
        role: msg.role,
        parts: msg.parts,
        createdAt: new Date(),
      }));

      if (toInsert.length > 0) {
        await db.insert(messages).values(toInsert).onConflictDoNothing();
      }

      // Update conversation timestamp and title if first message
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (!conv.title && body.messages.length > 0) {
        const firstUserMsg = body.messages.find((m) => m.role === "user");
        if (firstUserMsg) {
          const textPart = (firstUserMsg.parts as { type: string; text?: string }[])
            .find((p) => p.type === "text");
          if (textPart?.text) {
            updates.title = textPart.text.slice(0, 100);
          }
        }
      }

      await db
        .update(conversations)
        .set(updates)
        .where(eq(conversations.id, params.id));

      return {
        success: true,
        data: { ids: toInsert.map((m) => m.id) },
      };
    },
    {
      body: t.Object({
        messages: t.Array(
          t.Object({
            id: t.Optional(t.String()),
            role: t.String(),
            parts: t.Any(),
          }),
        ),
      }),
    },
  );
