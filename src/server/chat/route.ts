import {
  chatSearchQuery,
  claimConversationsBody,
  createConversationBody,
  finalizeTaskBody,
  mediaUploadBody,
  paginationQuery,
  persistMessagesBody,
  streamBody,
  titleGenerationBody,
  updateConversationBody,
} from "@/lib/validation/chat";
import { downloadAndUpload } from "@/lib/config/r2";
import { msg } from "@/lib/config/constants";
import { uid } from "@/lib/utils/base";
import { getDb } from "@/lib/db/client";
import { conversations, messages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  getApiKey,
  getApiKeyOrGuest,
  getGuestConvIds,
  getUserId,
} from "@/server/constants";
import { Elysia } from "elysia";
import {
  claimConversations,
  createConversation,
  createShareLink,
  deleteConversation,
  getConversationOrShared,
  getPaginatedMessages,
  getSharedConversation,
  listConversations,
  revokeShareLink,
  updateConversation,
} from "./conversation.service";
import { uploadMedia } from "./media.service";
import { persistMessages } from "./message.service";
import { streamChat } from "./stream.service";
import { fetchVideoTaskStatus } from "./task.service";
import { generateChatTitle } from "./title.service";

export const chatRoute = new Elysia({ prefix: "/chat" })

  .get(
    "/conversations",
    async ({ query, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      const data = await listConversations(
        userId,
        query,
        userId === 0 ? getGuestConvIds(cookie) : [],
      );
      return { success: true, data };
    },
    { query: chatSearchQuery },
  )

  .post(
    "/",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      const data = await createConversation(userId, body);
      return { success: true, data };
    },
    { body: createConversationBody },
  )

  .get(
    "/:id",
    async ({ params, query, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      const conv = await getConversationOrShared(userId, params.id);
      const paginated = await getPaginatedMessages(params.id, query);
      return { success: true, data: { ...conv, ...paginated } };
    },
    { query: paginationQuery },
  )

  .get("/:id/meta", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    const data = await getConversationOrShared(userId, params.id);
    return { success: true, data };
  })

  .put(
    "/:id",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      const data = await updateConversation(userId, params.id, body);
      return { success: true, data };
    },
    { body: updateConversationBody },
  )

  .delete("/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    const data = await deleteConversation(userId, params.id);
    return { success: true, data };
  })

  .post("/:id/share", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    const data = await createShareLink(userId, params.id);
    return { success: true, data };
  })

  .delete("/:id/share", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    const data = await revokeShareLink(userId, params.id);
    return { success: true, data };
  })

  .get(
    "/shared/:shareId",
    async ({ params, query }) => {
      const data = await getSharedConversation(params.shareId, query);
      return { success: true, data };
    },
    { query: paginationQuery },
  )

  .post(
    "/:id/title",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      const apiKey = getApiKeyOrGuest(cookie);
      const data = await generateChatTitle(
        apiKey,
        userId,
        params.id,
        body.text,
      );
      return { success: true, data };
    },
    { body: titleGenerationBody },
  )

  .post(
    "/:id/messages",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      const data = await persistMessages(userId, params.id, body.messages);
      return { success: true, data };
    },
    { body: persistMessagesBody },
  )

  .post(
    "/stream",
    async ({ body, cookie, request }) => {
      const apiKey = getApiKeyOrGuest(cookie);
      const uid = getUserId(cookie, true);
      const userId: number | "guest" = uid ?? "guest";
      if (!uid) body.webSearch = false;
      return streamChat(apiKey, body, request, userId);
    },
    { body: streamBody },
  )

  .post(
    "/claim",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      const data = await claimConversations(userId, body.convIds);
      return { success: true, data };
    },
    { body: claimConversationsBody },
  )

  .post(
    "/media",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      const data = await uploadMedia(body.file, body.convId, userId);
      return { success: true, data };
    },
    { body: mediaUploadBody },
  )

  .get("/task/:taskId", async ({ params, cookie }) => {
    const apiKey = getApiKey(cookie);
    const data = await fetchVideoTaskStatus(apiKey, params.taskId);
    return { success: true, data };
  })

  .post(
    "/:id/task/finalize",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      const convId = params.id;
      const { msgId, taskId, resultUrl } = body;
      const isGuest = userId === 0;
      if (isGuest) {
        const guestConvIds = getGuestConvIds(cookie);
        if (!guestConvIds.includes(convId))
          throw new Error(msg("ERRORS.NOT_FOUND"));
      }

      const db = getDb();
      const convRows = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(eq(conversations.id, convId), eq(conversations.userId, userId)),
        )
        .limit(1);
      if (convRows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

      const rows = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, msgId), eq(messages.convId, convId)))
        .limit(1);
      if (rows.length === 0) throw new Error(msg("ERRORS.NOT_FOUND"));

      const groupKey = uid(8);
      const r2Url = await downloadAndUpload(resultUrl, convId, groupKey);

      const row = rows[0];
      const parts = (row.parts ?? []) as Array<Record<string, unknown>>;
      const updatedParts = parts.map((p) =>
        p.type === "task" && p.taskId === taskId
          ? { type: "text", text: `![video](${r2Url})` }
          : p,
      );

      await db
        .update(messages)
        .set({ parts: updatedParts })
        .where(and(eq(messages.id, msgId), eq(messages.convId, convId)));

      return { success: true, data: { parts: updatedParts } };
    },
    { body: finalizeTaskBody },
  );
