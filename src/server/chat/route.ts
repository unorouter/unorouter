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
import { getApiKey, getUserId } from "@/server/constants";
import { Elysia } from "elysia";
import {
  createConversation,
  createShareLink,
  deleteConversation,
  getConversation,
  getPaginatedMessages,
  getSharedConversation,
  listConversations,
  revokeShareLink,
  updateConversation,
} from "./conversation.service";
import {
  generateImageMedia,
  generateVideo,
  uploadMedia,
} from "./media.service";
import { persistMessages } from "./message.service";
import { streamChat } from "./stream.service";

export const chatRoute = new Elysia({ prefix: "/chat" })

  .get(
    "/",
    async ({ query, cookie }) => {
      const userId = getUserId(cookie);
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
      const userId = getUserId(cookie);
      const conv = await getConversation(userId, params.id);
      const paginated = await getPaginatedMessages(params.id, query);
      return { success: true, data: { ...conv, ...paginated } };
    },
    { query: paginationQuery },
  )

  .get("/:id/meta", async ({ params, cookie }) => {
    const userId = getUserId(cookie);
    const data = await getConversation(userId, params.id);
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
  )

  .post(
    "/image",
    async ({ body, cookie }) => {
      const apiKey = getApiKey(cookie);
      const data = await generateImageMedia(apiKey, body);
      return { success: true, data };
    },
    { body: imageGenerationBody },
  )

  .post(
    "/video",
    async ({ body, cookie }) => {
      const apiKey = getApiKey(cookie);
      const data = await generateVideo(apiKey, body);
      return { success: true, data };
    },
    { body: videoGenerationBody },
  );
