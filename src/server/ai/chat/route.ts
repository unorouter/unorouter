import { GUEST_USER_ID } from "@/lib/config/constants";
import { assertGuestOwnPurposeAccess } from "@/server/auth/guest-consent.service";
import {
  finalizeTaskBody,
  forwardBody,
  streamBody,
  taskIdParams,
  titleGenerationBody,
  triggerImggenBody,
  triggerImgTaskBody,
  triggerLlmBody,
  triggerSimilarityBody,
  webSearchBody,
} from "@/lib/validation/chat";
import {
  assertGuestFreeModel,
  resolveChatApiKey,
} from "@/server/billing/token/best-key.service";
import { getUserId } from "@/server/constants";
import { serverEnv } from "@/server/env";
import { rateLimit } from "@/server/rate-limit";
import { Elysia } from "elysia";
import { generateInlayImage } from "./media/inlay.service";
import {
  fetchVideoTaskStatus,
  finalizeVideoTask,
  submitVideoTask,
} from "./media/task.service";
import { generateChatTitle, truncateToTitle } from "./title.service";
import { runTriggerLLM, runTriggerSimilarity } from "./trigger-ops.service";
import { streamMedia } from "./media/stream.service";
import { forwardChatCompletions } from "./forward.service";
import { forwardCustomProvider } from "./custom-forward.service";
import { abortStream, tailStream } from "./stream-buffer";
import { mirrorTail, publishAbort } from "./stream-mirror";
import { resolveWebSearch } from "./web-search.service";

const customForwardLimit = rateLimit(120);
const resumeLimit = rateLimit(60);

export const chatRoute = new Elysia({ prefix: "/chat" })

  // Open to guests by design; the caller's own Authorization is what stops this
  // being a free open relay. No chat key is resolved, logged or stored here.
  // Not buffered for resume: relay streams sharing the chat buffer let anyone
  // abort every paid reply on a pod, so a dropped caller ends the upstream call.
  .post(
    "/custom-forward/chat/completions",
    async ({ request }) => {
      return forwardCustomProvider({
        targetBase: request.headers.get("x-proxy-target"),
        path: "/chat/completions",
        method: "POST",
        authorization: request.headers.get("authorization"),
        body: await request.text(),
        signal: request.signal,
      });
    },
    { beforeHandle: customForwardLimit },
  )

  .get(
    "/custom-forward/models",
    async ({ request }) => {
      return forwardCustomProvider({
        targetBase: request.headers.get("x-proxy-target"),
        path: "/models",
        method: "GET",
        authorization: request.headers.get("authorization"),
        signal: request.signal,
      });
    },
    { beforeHandle: customForwardLimit },
  )

  // The rest of a reply whose connection dropped, from byte `from` on: from
  // this process's buffer, else from the Redis mirror when one is configured.
  .get(
    "/resume/:id",
    async ({ params, query, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      const from = Math.max(0, Number(query.from) || 0);
      const body =
        tailStream(params.id, userId, from) ??
        (await mirrorTail(params.id, userId, from));
      if (!body) return new Response(null, { status: 404 });
      return new Response(body, {
        headers: { "content-type": "text/event-stream" },
      });
    },
    { beforeHandle: resumeLimit },
  )

  .delete(
    "/resume/:id",
    async ({ params, cookie }) => {
      const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
      if (!abortStream(params.id, userId)) publishAbort(params.id, userId);
      return { success: true };
    },
    { beforeHandle: resumeLimit },
  )

  // Ordering is load-bearing: routes above must NOT resolve a chat key.
  // A request running on the guest key is a guest's request, whatever user-id
  // cookie came with it: an expired or dropped access_token kept a real user id,
  // so every guest gate keyed on userId waved it through on the shared key.
  .resolve(async ({ cookie }) => {
    const apiKey = await resolveChatApiKey(cookie);
    const userId =
      apiKey === serverEnv.guestApiKey
        ? GUEST_USER_ID
        : ((await getUserId(cookie, true)) ?? GUEST_USER_ID);
    return { apiKey, userId };
  })

  .post(
    "/title",
    async ({ body, cookie, apiKey, userId }) => {
      await assertGuestFreeModel(userId, body.model);
      // The title model is billed separately, so it needs its own guest check.
      await assertGuestFreeModel(userId, body.titleModel);
      await assertGuestOwnPurposeAccess(cookie, userId, body.model);
      await assertGuestOwnPurposeAccess(cookie, userId, body.titleModel);
      // A guest's text may only reach a model the guest consented to, so the
      // free trio is off the table and the chat model titles its own chat.
      const titleModel =
        body.titleModel ?? (userId === GUEST_USER_ID ? body.model : undefined);
      if (userId === GUEST_USER_ID && !titleModel)
        return { success: true, data: { title: truncateToTitle(body.text) } };
      const data = await generateChatTitle(apiKey, body.text, {
        titleModel,
        titleGroup: body.titleGroup,
        titlePrompt: body.titlePrompt,
      });
      return { success: true, data };
    },
    { body: titleGenerationBody },
  )

  .post(
    "/stream",
    async ({ body, cookie, apiKey, userId }) => {
      await assertGuestFreeModel(userId, body.model);
      await assertGuestOwnPurposeAccess(cookie, userId, body.model);
      return streamMedia(apiKey, body);
    },
    { body: streamBody },
  )

  .post(
    "/forward/chat/completions",
    async ({ body, cookie, request, apiKey, userId }) => {
      await assertGuestOwnPurposeAccess(
        cookie,
        userId,
        typeof body.model === "string" ? body.model : undefined,
      );
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
    // Every call runs a three-model classifier race and may spend a Tavily credit.
    { body: webSearchBody, beforeHandle: rateLimit(20) },
  )

  .post(
    "/trigger-op/llm",
    async ({ body, cookie, apiKey, userId }) => {
      await getUserId(cookie);
      await assertGuestOwnPurposeAccess(cookie, userId, body.model);
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
        air: body.air,
        references: body.references,
      });
      return { success: true, data };
    },
    { body: triggerImggenBody },
  )
  .post(
    "/trigger-op/imgtask",
    async ({ body, cookie, apiKey }) => {
      await getUserId(cookie);
      const data = await submitVideoTask(
        apiKey,
        body.model,
        body.prompt,
        body.group,
      );
      return { success: true, data };
    },
    { body: triggerImgTaskBody },
  )

  .get(
    "/task/:taskId",
    async ({ params, apiKey }) => {
      const data = await fetchVideoTaskStatus(apiKey, params.taskId);
      return { success: true, data };
    },
    { params: taskIdParams },
  )

  // The result URL comes from the caller's own task on the gateway, never from
  // the request: a caller-chosen URL made this an anonymous 50 MB fetcher.
  .post(
    "/task/finalize",
    async ({ body, apiKey }) => {
      const data = await finalizeVideoTask(apiKey, body.taskId);
      return { success: true, data };
    },
    { body: finalizeTaskBody, beforeHandle: rateLimit(30) },
  );
