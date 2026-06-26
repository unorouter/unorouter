import { getPricingSummary } from "@/lib/api/pricing-cache";
import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import {
  finalizeTaskBody,
  forwardBody,
  streamBody,
  titleGenerationBody,
  triggerImggenBody,
  triggerLlmBody,
  triggerSimilarityBody,
  webSearchBody,
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
import { streamMedia } from "./media-stream.service";
import { forwardChatCompletions } from "./forward.service";
import { resolveWebSearch } from "./context/web-search.service";

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

  // Media generation only (image/video/audio/embedding). Text models stream client-side via /forward.
  .post(
    "/stream",
    async ({ body, cookie, request }) => {
      const apiKey = await resolveChatApiKey(cookie);
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      if (userId === GUEST_USER_ID) {
        const meta = (await getPricingSummary()).byName.get(body.model);
        if (!meta?.isFree) throw new Error(msg("ERRORS.UNAUTHORIZED"));
      }
      return streamMedia(apiKey, body, request, userId);
    },
    { body: streamBody },
  )

  // Token-injecting SSE proxy for the default path. The browser ran the engine + streamText and POSTs the
  // assembled OpenAI wire body; this resolves the token + guest-gates + raw-pipes to new-api. The SDK appends
  // `/chat/completions` to its baseURL (`.../forward`), so the handler path is `/forward/chat/completions`.
  .post(
    "/forward/chat/completions",
    async ({ body, cookie, request }) => {
      const apiKey = await resolveChatApiKey(cookie);
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      return forwardChatCompletions({
        apiKey,
        userId,
        body,
        requestId: request.headers.get("x-request-id"),
      });
    },
    { body: forwardBody },
  )

  // Tavily web-search BFF: the client classifies need + injects the block. Keeps the Tavily secret server-side.
  .post(
    "/web-search",
    async ({ body, cookie }) => {
      const apiKey = await resolveChatApiKey(cookie);
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      const block = await resolveWebSearch(apiKey, userId, body.text);
      return { success: true, data: { block } };
    },
    { body: webSearchBody },
  )

  // V1 lowLevelAccess effects from client trigger modes. One endpoint per op for a concrete Eden return type. Auth required.
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
