import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import {
  deleteR2Prefix,
  downloadAndUpload,
  mediaKey,
  uploadToR2,
} from "@/lib/config/r2";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { uid } from "@/lib/utils/base";
import {
  chatSearchQuery,
  createConversationBody,
  imageGenerationBody,
  mediaUploadBody,
  paginationQuery,
  persistMessagesBody,
  streamBody,
  updateConversationBody,
  videoGenerationBody,
} from "@/lib/validation/chat";
import { getUserLogs } from "@/openapi";
import { getApiKey, getProvider, getUserId } from "@/server/constants";
import { convertToModelMessages, generateImage, streamText } from "ai";
import { and, desc, eq, like, sql } from "drizzle-orm";
import { Elysia } from "elysia";

async function getPaginatedMessages(
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
      .orderBy(desc(messages.createdAt))
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

export const chatRoute = new Elysia({ prefix: "/chat" })

  // List conversations for the authenticated user
  .get(
    "/",
    async ({ query, cookie }) => {
      const db = getDb();
      const userId = getUserId(cookie);
      const page = query.p ?? 1;
      const pageSize = query.page_size ?? 20;
      const offset = (page - 1) * pageSize;
      const keyword = query.keyword?.trim();

      const conditions = [eq(conversations.userId, userId)];
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
    { query: chatSearchQuery },
  )

  // Create a new conversation
  .post(
    "/",
    async ({ body, cookie }) => {
      const db = getDb();
      const userId = getUserId(cookie);
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

      return {
        success: true,
        data: { id, model: body.model, title: body.title ?? null },
      };
    },
    { body: createConversationBody },
  )

  // Get a single conversation with paginated messages (newest first)
  .get(
    "/:id",
    async ({ params, query, cookie }) => {
      const db = getDb();
      const userId = getUserId(cookie);

      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, params.id),
          eq(conversations.userId, userId),
        ),
      });
      if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

      const paginated = await getPaginatedMessages(params.id, query);
      return { success: true, data: { ...conv, ...paginated } };
    },
    { query: paginationQuery },
  )

  // Get conversation metadata only (no messages)
  .get("/:id/meta", async ({ params, cookie }) => {
    const db = getDb();
    const userId = getUserId(cookie);

    const conv = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, params.id),
        eq(conversations.userId, userId),
      ),
    });
    if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

    return { success: true, data: conv };
  })

  // Update conversation title
  .put(
    "/:id",
    async ({ params, body, cookie }) => {
      const db = getDb();
      const userId = getUserId(cookie);

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (body.title !== undefined) updates.title = body.title;
      if (body.model !== undefined) updates.model = body.model;

      const result = await db
        .update(conversations)
        .set(updates)
        .where(
          and(
            eq(conversations.id, params.id),
            eq(conversations.userId, userId),
          ),
        )
        .returning({ id: conversations.id });

      if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
      return {
        success: true,
        data: { id: params.id, title: body.title, model: body.model },
      };
    },
    { body: updateConversationBody },
  )

  // Delete a conversation (cascade deletes messages, cleanup R2)
  .delete("/:id", async ({ params, cookie }) => {
    const db = getDb();
    const userId = getUserId(cookie);

    const conv = await db.query.conversations.findFirst({
      where: and(
        eq(conversations.id, params.id),
        eq(conversations.userId, userId),
      ),
    });
    if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

    // Cleanup R2 media for this conversation
    deleteR2Prefix(`chat/${params.id}/`).catch(() => {});

    await db.delete(conversations).where(eq(conversations.id, params.id));

    return { success: true, data: { id: params.id } };
  })

  // Generate a share link
  .post("/:id/share", async ({ params, cookie }) => {
    const db = getDb();
    const userId = getUserId(cookie);
    const shareId = uid(12);

    const result = await db
      .update(conversations)
      .set({ shareId })
      .where(
        and(eq(conversations.id, params.id), eq(conversations.userId, userId)),
      )
      .returning({ id: conversations.id });

    if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
    return { success: true, data: { shareId } };
  })

  // Revoke share link
  .delete("/:id/share", async ({ params, cookie }) => {
    const db = getDb();
    const userId = getUserId(cookie);

    const result = await db
      .update(conversations)
      .set({ shareId: null })
      .where(
        and(eq(conversations.id, params.id), eq(conversations.userId, userId)),
      )
      .returning({ id: conversations.id });

    if (result.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));
    return { success: true, data: { id: params.id } };
  })

  // Public: get shared conversation (no auth required)
  .get(
    "/shared/:shareId",
    async ({ params, query }) => {
      const db = getDb();
      const conv = await db.query.conversations.findFirst({
        where: eq(conversations.shareId, params.shareId),
      });
      if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

      const paginated = await getPaginatedMessages(conv.id, query);
      return {
        success: true,
        data: {
          id: conv.id,
          title: conv.title,
          model: conv.model,
          createdAt: conv.createdAt,
          ...paginated,
        },
      };
    },
    { query: paginationQuery },
  )

  // Persist messages for a conversation
  .post(
    "/:id/messages",
    async ({ params, body, cookie }) => {
      const db = getDb();
      const userId = getUserId(cookie);

      // Verify ownership
      const conv = await db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, params.id),
          eq(conversations.userId, userId),
        ),
      });
      if (!conv) throw new Error(msg("ERRORS.NOT_FOUND"));

      const toInsert = body.messages.map((msg) => ({
        convId: params.id,
        role: msg.role,
        model: msg.model,
        parts: msg.parts,
        createdAt: new Date(),
      }));

      let inserted: { id: string }[] = [];
      if (toInsert.length > 0) {
        inserted = await db
          .insert(messages)
          .values(toInsert)
          .returning({ id: messages.id });
      }

      // Update conversation timestamp and title if first message
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (!conv.title && body.messages.length > 0) {
        const firstUserMsg = body.messages.find((m) => m.role === "user");
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
        .where(eq(conversations.id, params.id));

      return {
        success: true,
        data: {
          ids: inserted.map((m) => m.id),
          title: updates.title as string | undefined,
        },
      };
    },
    { body: persistMessagesBody },
  )

  // Stream text via AI SDK
  .post(
    "/stream",
    async ({ body, cookie, request }) => {
      const apiKey = getApiKey(cookie);
      const provider = getProvider(apiKey);
      const cookieHeader = request.headers.get("cookie") ?? "";

      const result = streamText({
        model: provider.chatModel(body.model),
        messages: await convertToModelMessages(body.messages),
        onFinish: async ({ usage, response }) => {
          console.error(`[onFinish] convId=${body.convId ?? "MISSING"}, model=${body.model}`);
          if (!body.convId) {
            console.error("[onFinish] BAIL: no convId");
            return;
          }
          const db = getDb();
          const reqId = response.headers?.["x-oneapi-request-id"] ?? undefined;
          const inputTokens = usage.inputTokens ?? 0;
          const outputTokens = usage.outputTokens ?? 0;
          console.error(`[onFinish] reqId=${reqId ?? "MISSING"}, tokens=${inputTokens}/${outputTokens}`);

          // Query new-api logs for exact cost
          let cost = 0;
          if (reqId) {
            try {
              const logRes = await getUserLogs(
                { request_id: reqId, type: 2, page_size: 1 },
                { headers: { cookie: cookieHeader } },
              );
              cost =
                (logRes.data as { data?: { items?: { quota?: number }[] } })
                  ?.data?.items?.[0]?.quota ?? 0;
              console.error(`[onFinish] cost lookup: ${cost}`);
            } catch (e) {
              console.error(`[onFinish] cost lookup FAILED: ${e}`);
            }
          }

          // Update last assistant message with usage data (retry since client may not have persisted yet)
          let msgId: string | undefined;
          for (let attempt = 0; attempt < 5; attempt++) {
            const lastMsg = await db
              .select({ id: messages.id })
              .from(messages)
              .where(
                and(
                  eq(messages.convId, body.convId),
                  eq(messages.role, "assistant"),
                ),
              )
              .orderBy(desc(messages.createdAt))
              .limit(1);
            msgId = lastMsg[0]?.id;
            if (msgId) break;
            console.error(`[onFinish] msg not found yet, attempt ${attempt + 1}/5`);
            await new Promise((r) => setTimeout(r, 500));
          }

          if (msgId) {
            console.error(`[onFinish] UPDATING msg=${msgId} with reqId=${reqId}, cost=${cost}`);
            await db
              .update(messages)
              .set({
                requestId: reqId,
                inputTokens,
                outputTokens,
                cost,
              })
              .where(eq(messages.id, msgId));
          } else {
            console.error(`[onFinish] FAILED: could not find assistant msg for convId=${body.convId} after 5 attempts`);
          }

          // Increment conversation totals
          await db
            .update(conversations)
            .set({
              totalInputTokens: sql`${conversations.totalInputTokens} + ${inputTokens}`,
              totalOutputTokens: sql`${conversations.totalOutputTokens} + ${outputTokens}`,
              totalCost: sql`${conversations.totalCost} + ${cost}`,
            })
            .where(eq(conversations.id, body.convId));
        },
      });

      return result.toUIMessageStreamResponse();
    },
    { body: streamBody },
  )

  // Upload media file to R2
  .post(
    "/media",
    async ({ body, cookie }) => {
      getUserId(cookie); // auth check

      const file = body.file;
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() ?? "bin";
      const filename = `${uid(8)}.${ext}`;
      const key = mediaKey(body.convId, uid(8), filename);
      const url = await uploadToR2(key, buffer, file.type);

      return {
        success: true,
        data: { url, mimeType: file.type, sizeBytes: buffer.length },
      };
    },
    { body: mediaUploadBody },
  )

  // Generate image via AI SDK
  .post(
    "/image",
    async ({ body, cookie }) => {
      const apiKey = getApiKey(cookie);
      const provider = getProvider(apiKey);

      const { images } = await generateImage({
        model: provider.imageModel(body.model),
        prompt: body.prompt,
      });

      if (!images || images.length === 0) {
        throw new Error(msg("ERRORS.NO_IMAGE_GENERATED"));
      }

      const urls: string[] = [];
      const groupKey = uid(8);
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const filename = `${uid(8)}.png`;
        const key = mediaKey(body.convId, groupKey, filename);
        const buffer = Buffer.from(image.base64, "base64");
        const url = await uploadToR2(key, buffer, "image/png");
        urls.push(url);
      }

      return { success: true, data: { urls } };
    },
    { body: imageGenerationBody },
  )

  // Generate video (submit task, poll, download, upload to R2)
  .post(
    "/video",
    async ({ body, cookie }) => {
      const apiKey = getApiKey(cookie);

      const submitBody: Record<string, unknown> = {
        model: body.model,
        prompt: body.prompt,
      };
      if (body.image) submitBody.image = body.image;

      const submitRes = await fetch(`${env.apiUrl}/v1/video/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(submitBody),
      });

      if (!submitRes.ok) {
        const err = await submitRes.text();
        throw new Error(err);
      }

      const submitData = await submitRes.json();
      const taskId = submitData.id || submitData.task_id;

      if (!taskId) {
        const videoUrl = submitData.data?.[0]?.url || submitData.url;
        if (videoUrl) {
          const r2Url = await downloadAndUpload(
            videoUrl,
            body.convId,
            uid(8),
          );
          return { success: true, data: { url: r2Url } };
        }
        throw new Error(msg("ERRORS.NO_TASK_ID"));
      }

      // Poll for completion (max 5 minutes, 5s intervals)
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 5000));

        const pollRes = await fetch(
          `${env.apiUrl}/v1/video/generations/${taskId}`,
          { headers: { Authorization: `Bearer ${apiKey}` } },
        );
        if (!pollRes.ok) continue;

        const pollData = await pollRes.json();
        const status = pollData.status;

        if (
          status === "completed" ||
          status === "succeeded" ||
          status === "ready"
        ) {
          const videoUrl =
            pollData.data?.[0]?.url ||
            pollData.output?.url ||
            pollData.result?.url ||
            pollData.url;

          if (!videoUrl) throw new Error(msg("ERRORS.NO_VIDEO_URL"));

          const r2Url = await downloadAndUpload(
            videoUrl,
            body.convId,
            uid(8),
          );
          return { success: true, data: { url: r2Url } };
        }

        if (status === "failed" || status === "error") {
          throw new Error(
            pollData.error || msg("ERRORS.VIDEO_GENERATION_FAILED"),
          );
        }
      }

      throw new Error(msg("ERRORS.VIDEO_GENERATION_TIMED_OUT"));
    },
    { body: videoGenerationBody },
  );
