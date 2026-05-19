import {
  chatSearchQuery,
  claimConversationsBody,
  createConversationBody,
  editMessageBody,
  finalizeTaskBody,
  mediaUploadBody,
  paginationQuery,
  persistMessagesBody,
  setActiveBranchBody,
  streamBody,
  titleGenerationBody,
  updateConversationBody,
} from "@/lib/validation/chat";
import {
  getApiKey,
  getApiKeyOrGuest,
  getGuestConvIds,
  getUserId,
} from "@/server/constants";
import { Elysia } from "elysia";
import {
  claimConversations,
  clearConversation,
  createConversation,
  deleteConversation,
  duplicateConversation,
  getConversation,
  getConversationMarkdown,
  getPaginatedMessages,
  listConversations,
  updateConversation,
} from "./conversation.service";
import { uploadMedia } from "./augmentation/media.service";
import {
  fetchVideoTaskStatus,
  finalizeVideoTask,
} from "./augmentation/task.service";
import { generateChatTitle } from "./augmentation/title.service";
import {
  deleteMessage,
  editMessageItems,
  persistMessages,
  setActiveBranch,
} from "./message.service";
import { streamChat } from "./stream.service";

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
      const conv = await getConversation(userId, params.id);
      const paginated = await getPaginatedMessages(params.id, query);
      return { success: true, data: { ...conv, ...paginated } };
    },
    { query: paginationQuery },
  )

  .get("/:id/meta", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    const data = await getConversation(userId, params.id);
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

  .post("/:id/clear", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    const data = await clearConversation(userId, params.id);
    return { success: true, data };
  })

  .post("/:id/duplicate", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    const data = await duplicateConversation(userId, params.id);
    return { success: true, data };
  })

  .get("/:id/markdown", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    const data = await getConversationMarkdown(userId, params.id);
    return { success: true, data };
  })

  .post(
    "/title",
    async ({ body, cookie }) => {
      const apiKey = getApiKeyOrGuest(cookie);
      const data = await generateChatTitle(apiKey, body.text, body.model);
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

  .put(
    "/:id/messages/:msgId",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie, true) ?? 0;
      const data = await editMessageItems(
        userId,
        params.id,
        params.msgId,
        body.items,
      );
      return { success: true, data };
    },
    { body: editMessageBody },
  )

  .delete("/:id/messages/:msgId", async ({ params, cookie }) => {
    const userId = getUserId(cookie, true) ?? 0;
    const data = await deleteMessage(userId, params.id, params.msgId);
    return { success: true, data };
  })

  .post(
    "/:id/active-branch",
    async ({ params, body, cookie }) => {
      const userId = getUserId(cookie);
      const data = await setActiveBranch(userId, params.id, body.messageId);
      return { success: true, data };
    },
    { body: setActiveBranchBody },
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
      const userId = getUserId(cookie, true) ?? 0;
      const data = await finalizeVideoTask(userId, cookie, params.id, body);
      return { success: true, data };
    },
    { body: finalizeTaskBody },
  );
