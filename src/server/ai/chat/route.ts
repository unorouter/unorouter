import { getPricingSummary } from "@/lib/api/pricing-cache";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import {
  finalizeTaskBody,
  streamBody,
  titleGenerationBody,
  triggerImggenBody,
  triggerLlmBody,
  triggerSimilarityBody,
} from "@/lib/validation/chat";
import { resolveChatApiKey } from "@/server/billing/token/best-key.service";
import { getApiKey, getUserId } from "@/server/constants";
import { Elysia } from "elysia";
import { generateInlayImage } from "./media/inlay.service";
import { fetchVideoTaskStatus, finalizeVideoTask } from "./media/task.service";
import { generateChatTitle } from "./title.service";
import { runTriggerLLM, runTriggerSimilarity } from "./triggers/trigger-ops";
import {
  getConversation,
  getConversationMarkdown,
} from "./conversation.service";
import { streamChat } from "./stream.service";
import { ContextRequiredError } from "./pipeline/context-cache";

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
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      if (userId === GUEST_USER_ID && body.model) {
        const meta = (await getPricingSummary()).byName.get(body.model);
        if (!meta?.isFree) throw new Error(msg("ERRORS.UNAUTHORIZED"));
      }
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
      if (userId === GUEST_USER_ID) {
        body.webSearch = false;
        const meta = (await getPricingSummary()).byName.get(body.model);
        if (!meta?.isFree) throw new Error(msg("ERRORS.UNAUTHORIZED"));
      }
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

      // V1 lowLevelAccess effects invoked from client trigger modes. One endpoint per op so Eden infers a concrete return type each. Auth required; guests have no trigger budget.
  .post(
    "/trigger-op/llm",
    async ({ body, cookie }) => {
      await getUserId(cookie);
      const apiKey = await resolveChatApiKey(cookie);
      const data = await runTriggerLLM(apiKey, body.model, body.prompt);
      return { success: true, data };
    },
    { body: triggerLlmBody },
  )
  .post(
    "/trigger-op/similarity",
    async ({ body, cookie }) => {
      await getUserId(cookie);
      const apiKey = await resolveChatApiKey(cookie);
      const data = await runTriggerSimilarity(apiKey, body.source, body.values);
      return { success: true, data };
    },
    { body: triggerSimilarityBody },
  )
  .post(
    "/trigger-op/imggen",
    async ({ body, cookie }) => {
      await getUserId(cookie);
      const apiKey = await resolveChatApiKey(cookie);
      const data = await generateInlayImage(apiKey, body.prompt);
      return { success: true, data };
    },
    { body: triggerImggenBody },
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
