import { GUEST_USER_ID, msg } from "@/lib/config/constants";
import { getPricingSummary } from "@/lib/api/pricing-cache";
import {
  finalizeTaskBody,
  streamBody,
  titleGenerationBody,
  triggerImggenBody,
  triggerLlmBody,
  triggerSimilarityBody,
} from "@/lib/validation/chat";
import { getApiKey, getUserId } from "@/server/constants";
import { resolveChatApiKey } from "@/server/billing/token/best-key.service";
import { Elysia } from "elysia";

// Guests stream on the shared guest key, so they may only run free models.
// The stream/title endpoints take a client-supplied model; without this a
// guest could spend the guest key on any paid model (parity with playground
// submit's assertGuestAllowedModel).
async function assertGuestChatModel(model: string): Promise<void> {
  const meta = (await getPricingSummary()).byName.get(model);
  if (!meta?.isFree) throw new Error(msg("ERRORS.UNAUTHORIZED"));
}
import {
  getConversation,
  getConversationMarkdown,
} from "./conversation.service";
import {
  fetchVideoTaskStatus,
  finalizeVideoTask,
} from "./augmentation/task.service";
import { generateChatTitle } from "./augmentation/title.service";
import { generateInlayImage } from "./augmentation/inlay.service";
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
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      if (userId === GUEST_USER_ID && body.model) {
        await assertGuestChatModel(body.model);
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
        await assertGuestChatModel(body.model);
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

  // V1 lowLevelAccess effects invoked from client trigger modes. One endpoint
  // per op so Eden infers a concrete return type each (no client-side cast off
  // a merged union). Auth required; guests have no trigger budget.
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
