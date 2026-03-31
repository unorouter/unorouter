import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { deleteR2Prefix, mediaKey, uploadToR2 } from "@/lib/storage/r2";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";
import { and, desc, eq, sql } from "drizzle-orm";
import { Elysia } from "elysia";
import { nanoid } from "nanoid";
import { deriveUpstream } from "../constants";
import {
  createConversationBody,
  imageGenerationBody,
  listConversationsQuery,
  mediaUploadBody,
  persistMessagesBody,
  streamBody,
  updateConversationBody,
  videoGenerationBody,
} from "@/lib/validation/chat";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

function getUserId(upstream: { headers: Record<string, string> }): number {
  const raw = upstream.headers["New-Api-User"];
  if (!raw) throw new Error("Unauthorized");
  return Number(raw);
}

function getAccessToken(upstream: { headers: Record<string, string> }): string {
  const token = upstream.headers.Authorization;
  if (!token) throw new Error("Unauthorized");
  return token;
}

function getProvider(accessToken: string) {
  return createOpenAICompatible({
    name: "unorouter",
    baseURL: `${API_URL}/v1`,
    apiKey: accessToken,
  });
}

async function downloadAndUpload(
  videoUrl: string,
  convId: string,
  msgId: string,
): Promise<string> {
  const res = await fetch(videoUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "video/mp4";
  const ext = contentType.split("/")[1] ?? "mp4";
  const filename = `${nanoid(8)}.${ext}`;
  const key = mediaKey(convId, msgId, filename);
  return uploadToR2(key, buffer, contentType);
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
    { query: listConversationsQuery },
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
    { body: createConversationBody },
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
    { body: updateConversationBody },
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

    await db.delete(conversations).where(eq(conversations.id, params.id));

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
        and(eq(conversations.id, params.id), eq(conversations.userId, userId)),
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
        and(eq(conversations.id, params.id), eq(conversations.userId, userId)),
      )
      .returning({ id: conversations.id });

    if (result.length === 0) throw new Error("Not found");
    return { success: true, data: { id: params.id } };
  })

  // Public: get shared conversation (no auth required)
  .get("/shared/:shareId", async ({ params }) => {
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
  })

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
        data: { ids: toInsert.map((m) => m.id) },
      };
    },
    { body: persistMessagesBody },
  )

  // Stream text via AI SDK
  .post(
    "/stream",
    async ({ body, upstream }) => {
      const accessToken = getAccessToken(upstream);
      const provider = getProvider(accessToken);

      const result = streamText({
        model: provider.chatModel(body.model),
        messages: body.messages,
      });

      return result.toUIMessageStreamResponse();
    },
    { body: streamBody },
  )

  // Upload media file to R2
  .post(
    "/media",
    async ({ body, upstream }) => {
      getUserId(upstream); // auth check

      const file = body.file;
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error(
          "File type not allowed. Accepted: PNG, JPEG, WebP, GIF, PDF.",
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error("File too large. Maximum size is 20MB.");
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() ?? "bin";
      const filename = `${nanoid(8)}.${ext}`;
      const key = mediaKey(body.convId, body.msgId, filename);
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
    async ({ body, upstream }) => {
      const accessToken = getAccessToken(upstream);
      const provider = getProvider(accessToken);
      const { generateImage } = await import("ai");

      const { images } = await generateImage({
        model: provider.imageModel(body.model),
        prompt: body.prompt,
      });

      if (!images || images.length === 0) {
        throw new Error("No image generated");
      }

      const urls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const filename = `${nanoid(8)}.png`;
        const key = mediaKey(body.convId, body.msgId, filename);
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
    async ({ body, upstream }) => {
      const accessToken = getAccessToken(upstream);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      };

      const submitBody: Record<string, unknown> = {
        model: body.model,
        prompt: body.prompt,
      };
      if (body.image) submitBody.image = body.image;

      const submitRes = await fetch(`${API_URL}/v1/video/generations`, {
        method: "POST",
        headers,
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
            body.msgId,
          );
          return { success: true, data: { url: r2Url } };
        }
        throw new Error("No task ID or URL in response");
      }

      // Poll for completion (max 5 minutes, 5s intervals)
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 5000));

        const pollRes = await fetch(
          `${API_URL}/v1/video/generations/${taskId}`,
          { headers },
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

          if (!videoUrl) throw new Error("Completed but no video URL found");

          const r2Url = await downloadAndUpload(
            videoUrl,
            body.convId,
            body.msgId,
          );
          return { success: true, data: { url: r2Url } };
        }

        if (status === "failed" || status === "error") {
          throw new Error(pollData.error || "Video generation failed");
        }
      }

      throw new Error("Video generation timed out");
    },
    { body: videoGenerationBody },
  );
