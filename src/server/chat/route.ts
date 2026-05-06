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
import { downloadAndUpload } from "@/lib/config/r2";
import { msg } from "@/lib/config/constants";
import { uid } from "@/lib/utils/base";
import { getDb } from "@/lib/db/client";
import { conversations, messageItems, messages } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
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
  createShareLink,
  deleteConversation,
  duplicateConversation,
  getConversationMarkdown,
  getConversationOrShared,
  getPaginatedMessages,
  getSharedConversation,
  listConversations,
  revokeShareLink,
  updateConversation,
} from "./conversation.service";
import { uploadMedia } from "./augmentation/media.service";
import { fetchVideoTaskStatus } from "./augmentation/task.service";
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

      // Find the task item and replace with a text item pointing at the rehosted URL
      const items = await db
        .select()
        .from(messageItems)
        .where(eq(messageItems.messageId, msgId))
        .orderBy(asc(messageItems.sequenceIndex));

      const updatedItems = items.map((it) => {
        if (
          it.type === "task" &&
          (it.data as Record<string, unknown>).task_id === taskId
        ) {
          return {
            ...it,
            type: "text",
            data: { text: `![video](${r2Url})` },
          };
        }
        return it;
      });

      await db.transaction(async (tx) => {
        await tx
          .delete(messageItems)
          .where(eq(messageItems.messageId, msgId));
        if (updatedItems.length > 0) {
          await tx.insert(messageItems).values(
            updatedItems.map((it, seq) => ({
              id: it.id,
              messageId: msgId,
              sequenceIndex: seq,
              outputIndex: it.outputIndex,
              type: it.type,
              data: it.data,
            })),
          );
        }
      });

      return { success: true, data: { items: updatedItems } };
    },
    { body: finalizeTaskBody },
  );
