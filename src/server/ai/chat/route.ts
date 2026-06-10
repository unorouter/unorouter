import { GUEST_USER_ID } from "@/lib/config/constants";
import {
  finalizeTaskBody,
  streamBody,
  titleGenerationBody,
  triggerOpBody,
} from "@/lib/validation/chat";
import { getApiKey, getUserId } from "@/server/constants";
import { resolveChatApiKey } from "@/server/billing/token/best-key.service";
import { Elysia } from "elysia";
import {
  getConversation,
  getConversationMarkdown,
} from "./conversation.service";
import {
  fetchVideoTaskStatus,
  finalizeVideoTask,
} from "./augmentation/task.service";
import { generateChatTitle } from "./augmentation/title.service";
import {
  runTriggerLLM,
  runTriggerSimilarity,
} from "./augmentation/trigger-ops";
import { ContextRequiredError } from "./stream/context-cache";
import { streamChat } from "./stream.service";

export const chatRoute = new Elysia({ prefix: "/chat" })

  .get("/:id/meta", async ({ params, cookie }) => {
    const userId = await getUserId(cookie);
    const data = await getConversation(userId, params.id);
    return { success: true, data };
  })

  .get("/:id/markdown", async ({ params, cookie }) => {
    const userId = await getUserId(cookie);
    const data = await getConversationMarkdown(userId, params.id);
    return { success: true, data };
  })

  .post(
    "/title",
    async ({ body, cookie }) => {
      const apiKey = await resolveChatApiKey(cookie);
      const data = await generateChatTitle(apiKey, body.text, body.model);
      return { success: true, data };
    },
    { body: titleGenerationBody },
  )

  .post(
    "/stream",
    async ({ body, cookie, request }) => {
      const apiKey = await resolveChatApiKey(cookie);
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      if (userId === GUEST_USER_ID) body.webSearch = false;
      try {
        return await streamChat(apiKey, body, request, userId);
      } catch (err) {
        // Context-cache miss: tell the client to retry with the full context.
        if (err instanceof ContextRequiredError) {
          return new Response(JSON.stringify({ code: "context-required" }), {
            status: 409,
            headers: { "content-type": "application/json" },
          });
        }
        throw err;
      }
    },
    { body: streamBody },
  )

  // V1 lowLevelAccess effects invoked from client trigger modes.
  .post(
    "/trigger-op",
    async ({ body, cookie }) => {
      await getUserId(cookie); // auth required; guests have no trigger budget
      const apiKey = await resolveChatApiKey(cookie);
      if (body.op === "llm") {
        const data = await runTriggerLLM(apiKey, body.model, body.prompt);
        return { success: true, data };
      }
      if (body.op === "similarity") {
        const data = await runTriggerSimilarity(
          apiKey,
          body.source,
          body.values,
        );
        return { success: true, data };
      }
      // imggen wired by the inlay module.
      const data = "Error: Image generation failed";
      return { success: true, data };
    },
    { body: triggerOpBody },
  )

  .get("/task/:taskId", async ({ params, cookie }) => {
    const apiKey = getApiKey(cookie);
    const data = await fetchVideoTaskStatus(apiKey, params.taskId);
    return { success: true, data };
  })

  .post(
    "/:id/task/finalize",
    async ({ params, body, cookie }) => {
      const userId = await getUserId(cookie);
      const data = await finalizeVideoTask(userId, params.id, body);
      return { success: true, data };
    },
    { body: finalizeTaskBody },
  );
