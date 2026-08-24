import { GUEST_USER_ID } from "@/lib/config/constants";
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
import {
  assertGuestFreeModel,
  resolveChatApiKey,
} from "@/server/billing/token/best-key.service";
import { getUserId } from "@/server/constants";
import { Elysia } from "elysia";
import { generateInlayImage } from "./media/inlay.service";
import { fetchVideoTaskStatus, finalizeVideoTask } from "./media/task.service";
import { generateChatTitle } from "./title.service";
import { runTriggerLLM, runTriggerSimilarity } from "./trigger-ops.service";
import { streamMedia } from "./media/stream.service";
import { forwardChatCompletions } from "./forward.service";
import { forwardCustomProvider } from "./custom-forward.service";
import { resolveWebSearch } from "./web-search.service";

export const chatRoute = new Elysia({ prefix: "/chat" })

  // Open to guests by design; the caller's own Authorization is what stops this
  // being a free open relay. No chat key is resolved, logged or stored here.
  .post("/custom-forward/chat/completions", async ({ request }) => {
    return forwardCustomProvider({
      targetBase: request.headers.get("x-proxy-target"),
      path: "/chat/completions",
      method: "POST",
      authorization: request.headers.get("authorization"),
      body: await request.text(),
      signal: request.signal,
    });
  })

  .get("/custom-forward/models", async ({ request }) => {
    return forwardCustomProvider({
      targetBase: request.headers.get("x-proxy-target"),
      path: "/models",
      method: "GET",
      authorization: request.headers.get("authorization"),
      signal: request.signal,
    });
  })

  .post(
    "/task/finalize",
    async ({ body }) => {
      const data = await finalizeVideoTask(body);
      return { success: true, data };
    },
    { body: finalizeTaskBody },
  )

  // Ordering is load-bearing: routes above must NOT resolve a chat key.
  .resolve(async ({ cookie }) => ({
    apiKey: await resolveChatApiKey(cookie),
    userId: (await getUserId(cookie, true)) ?? GUEST_USER_ID,
  }))

  .post(
    "/title",
    async ({ body, apiKey, userId }) => {
      await assertGuestFreeModel(userId, body.model);
      // The title model is billed separately, so it needs its own guest check.
      await assertGuestFreeModel(userId, body.titleModel);
      const data = await generateChatTitle(apiKey, body.text, {
        titleModel: body.titleModel,
        titleGroup: body.titleGroup,
        titlePrompt: body.titlePrompt,
      });
      return { success: true, data };
    },
    { body: titleGenerationBody },
  )

  .post(
    "/stream",
    async ({ body, request, apiKey, userId }) => {
      await assertGuestFreeModel(userId, body.model);
      return streamMedia(apiKey, body, request, userId);
    },
    { body: streamBody },
  )

  .post(
    "/forward/chat/completions",
    async ({ body, request, apiKey, userId }) => {
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
    async ({ body, apiKey, userId }) => {
      const block = await resolveWebSearch(apiKey, userId, body.text);
      return { success: true, data: { block } };
    },
    { body: webSearchBody },
  )

  .post(
    "/trigger-op/llm",
    async ({ body, cookie, apiKey }) => {
      await getUserId(cookie);
      const data = await runTriggerLLM(
        apiKey,
        body.model,
        body.prompt,
        body.group,
      );
      return { success: true, data };
    },
    { body: triggerLlmBody },
  )
  .post(
    "/trigger-op/similarity",
    async ({ body, cookie, apiKey }) => {
      await getUserId(cookie);
      const data = await runTriggerSimilarity(apiKey, body.source, body.values);
      return { success: true, data };
    },
    { body: triggerSimilarityBody },
  )
  .post(
    "/trigger-op/imggen",
    async ({ body, cookie, apiKey }) => {
      await getUserId(cookie);
      const data = await generateInlayImage(apiKey, body.prompt, {
        model: body.model,
        group: body.group,
        references: body.references,
      });
      return { success: true, data };
    },
    { body: triggerImggenBody },
  )

  .get("/task/:taskId", async ({ params, apiKey }) => {
    const data = await fetchVideoTaskStatus(apiKey, params.taskId);
    return { success: true, data };
  });
