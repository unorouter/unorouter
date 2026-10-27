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
import { abortStream, peerUrl, tailStream } from "./stream-buffer";
import { resolveWebSearch } from "./web-search.service";

const customForwardLimit = rateLimit(120);

export const chatRoute = new Elysia({ prefix: "/chat" })

  // Open to guests by design; the caller's own Authorization is what stops this
  // being a free open relay. No chat key is resolved, logged or stored here.
  .post(
    "/custom-forward/chat/completions",
    async ({ request, cookie }) => {
      return forwardCustomProvider({
        targetBase: request.headers.get("x-proxy-target"),
        path: "/chat/completions",
        method: "POST",
        authorization: request.headers.get("authorization"),
        body: await request.text(),
        signal: request.signal,
        resumeFor: (await getUserId(cookie, true)) ?? GUEST_USER_ID,
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

  .post(
    "/task/finalize",
    async ({ body }) => {
      const data = await finalizeVideoTask(body);
      return { success: true, data };
    },
    { body: finalizeTaskBody, beforeHandle: rateLimit(30) },
  )

  // The rest of a reply whose connection dropped, from byte `from` on. A tab
  // can come back through the other replica, which forwards to the owner once.
  .get("/resume/:id", async ({ params, query, cookie, request }) => {
    const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
    const from = Math.max(0, Number(query.from) || 0);
    const local = tailStream(params.id, userId, from);
    if (local)
      return new Response(local, {
        headers: { "content-type": "text/event-stream" },
      });
    const peer = request.headers.get("x-uno-hop")
      ? null
      : peerUrl(
          query.pod ?? null,
          `/api/ai/chat/resume/${encodeURIComponent(params.id)}?from=${from}`,
        );
    if (!peer) return new Response(null, { status: 404 });
    const res = await fetch(peer, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        "x-uno-hop": "1",
      },
    }).catch(() => null);
    if (!res?.ok || !res.body) return new Response(null, { status: 404 });
    return new Response(res.body, {
      headers: { "content-type": "text/event-stream" },
    });
  })

  .delete("/resume/:id", async ({ params, query, cookie, request }) => {
    const userId = (await getUserId(cookie, true)) ?? GUEST_USER_ID;
    if (abortStream(params.id, userId)) return { success: true };
    const peer = request.headers.get("x-uno-hop")
      ? null
      : peerUrl(
          query.pod ?? null,
          `/api/ai/chat/resume/${encodeURIComponent(params.id)}`,
        );
    if (peer)
      await fetch(peer, {
        method: "DELETE",
        headers: {
          cookie: request.headers.get("cookie") ?? "",
          "x-uno-hop": "1",
        },
      }).catch(() => null);
    return { success: true };
  })

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
  );
