import {
  chatSearchQuery,
  createConversationBody,
  mediaUploadBody,
  paginationQuery,
  persistMessagesBody,
  streamBody,
  titleGenerationBody,
  updateConversationBody,
} from "@/lib/validation/chat";
import { getApiKey, getUserId } from "@/server/constants";
import { Elysia } from "elysia";
import {
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
import { generateChatTitle } from "./title.service";

export const chatRoute = new Elysia({ prefix: "/chat" })

  .get(
    "/conversations",
    async ({ query, cookie }) => {
      const userId = getUserId(cookie, true);
      if (!userId) return { success: true, data: { items: [], total: 0 } };
      const data = await listConversations(userId, query);
      return { success: true, data };
    },
    { query: chatSearchQuery },
  )

  .post(
    "/",
    async ({ body, cookie }) => {
      const userId = getUserId(cookie);
      const data = await createConversation(userId, body);
      return { success: true, data };
    },
    { body: createConversationBody },
  )

  .get(
    "/:id",
    async ({ params, query, cookie }) => {
      const userId = getUserId(cookie, true);
      const conv = await getConversationOrShared(userId, params.id);
      const paginated = await getPaginatedMessages(params.id, query);
      return { success: true, data: { ...conv, ...paginated } };
    },
    { query: paginationQuery },
  )

  .get("/:id/meta", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true);
    const data = await getConversationOrShared(userId, params.id);
    return { success: true, data };
  })

  .put(
    "/:id",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      const data = await updateConversation(userId, params.id, body);
      return { success: true, data };
    },
    { body: updateConversationBody },
  )

  .delete("/:id", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
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
      const userId = getUserId(cookie);
      const apiKey = getApiKey(cookie);
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
      const userId = getUserId(cookie);
      const data = await persistMessages(userId, params.id, body.messages);
      return { success: true, data };
    },
    { body: persistMessagesBody },
  )

  .post(
    "/stream",
    async ({ body, cookie, request }) => {
      const apiKey = getApiKey(cookie);
      return streamChat(apiKey, body, request);
    },
    { body: streamBody },
  )

  .post(
    "/media",
    async ({ body, cookie }) => {
      getUserId(cookie);
      const data = await uploadMedia(body.file, body.convId);
      return { success: true, data };
    },
    { body: mediaUploadBody },
  );
