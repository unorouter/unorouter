import { getPricingSnapshot } from "@/server/models/pricing/pricing-snapshot";
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
import { streamMedia } from "./media-stream.service";
import { forwardChatCompletions } from "./forward.service";
import { resolveWebSearch } from "./context/web-search.service";

export const chatRoute = new Elysia({ prefix: "/chat" })

  .post(
    "/title",
    async ({ body, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      if (userId === GUEST_USER_ID && body.model) {
        const meta = (await getPricingSnapshot()).byName.get(body.model);
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
        const meta = (await getPricingSnapshot()).byName.get(body.model);
        if (!meta?.isFree) throw new Error(msg("ERRORS.UNAUTHORIZED"));
      }
      return streamMedia(apiKey, body, request, userId);
    },
    { body: streamBody },
  )

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
        group: request.headers.get("x-group"),
      });
    },
    { body: forwardBody },
  )

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
      const data = await generateInlayImage(apiKey, body.prompt, {
        model: body.model,
        references: body.references,
      });
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
    async ({ params, body }) => {
      const data = await finalizeVideoTask(params.id, body);
      return { success: true, data };
    },
    { body: finalizeTaskBody },
  );
