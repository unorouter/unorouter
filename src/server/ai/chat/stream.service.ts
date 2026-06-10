import { isMediaModel } from "@/lib/api/pricing-cache";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { getDb } from "@/lib/db/server/client";
import { conversations, requestLogs } from "@/lib/db/schema/shared";
import { captureServerEvent } from "@/lib/posthog-server";
import { errMessage, uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getProvider } from "@/server/constants";
import { eq } from "drizzle-orm";
import {
  convertToModelMessages,
  extractReasoningMiddleware,
  streamText,
  wrapLanguageModel,
} from "ai";

import {
  handleAudioStream,
  handleBufferedStream,
  handleEmbeddingStream,
  handleImageStream,
  handleVideoTaskStream,
} from "./stream/media-stream";
import { prepareChatRequest, type StreamBody } from "./stream/prepare";

// Request-log persistence for synced convs: server owns the snapshot, so writing
// it here saves the client pushing the full prompt up every turn. Guests/local-only
// keep the client copy. Fire-and-forget: a miss only costs the cross-device copy.
function persistRequestLogIfSynced(
  convId: string | null | undefined,
  msgId: string,
  debug: Record<string, unknown>,
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    durationMs: number;
    tokensPerSecond?: number;
  },
): void {
  if (!convId) return;
  void (async () => {
    const db = getDb();
    const conv = await db
      .select({ syncExpiresAt: conversations.syncExpiresAt })
      .from(conversations)
      .where(eq(conversations.id, convId))
      .limit(1);
    if (!conv[0] || conv[0].syncExpiresAt == null) return;
    const row = {
      msgId,
      convId,
      requestBody: debug.requestBody,
      assembledSystem: (debug.assembledSystem ?? null) as string | null,
      finalMessages: debug.finalMessages,
      responseHeaders: debug.responseHeaders ?? null,
      droppedParams: (debug.droppedParams ?? null) as string | null,
      requestId: (debug.requestId ?? null) as string | null,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cost: usage.cost,
      durationMs: usage.durationMs,
      tokensPerSecond: usage.tokensPerSecond ?? null,
    };
    await db
      .insert(requestLogs)
      .values(row as typeof requestLogs.$inferInsert)
      .onConflictDoUpdate({
        target: requestLogs.msgId,
        set: row as typeof requestLogs.$inferInsert,
      });
  })().catch((err) => {
    logger.warn("Server request-log persist failed", {
      context: "stream.request-log",
      convId,
      msgId,
      error: errMessage(err),
    });
  });
}

export async function streamChat(
  apiKey: string,
  body: StreamBody,
  request: Request,
  userId: number,
) {
  const { buffered, mediaType } = await isMediaModel(body.model);

  logger.info("Stream started", {
    context: "stream",
    model: body.model,
    mediaType,
    convId: body.convId,
  });

  captureServerEvent({
    event: "chat_stream_started",
    request,
    userId,
    properties: {
      model: body.model,
      media_type: mediaType,
      conv_id: body.convId,
      web_search: !!body.webSearch,
      is_guest: userId === GUEST_USER_ID,
    },
  });

  switch (mediaType) {
    case "image":
      return handleImageStream(apiKey, body, userId);
    case "video":
      return handleVideoTaskStream(apiKey, body, userId);
    case "audio":
      return handleAudioStream(apiKey, body);
    case "embedding":
      return handleEmbeddingStream(apiKey, body);
  }

  const prepared = await prepareChatRequest(apiKey, body, request, userId);
  const {
    modelInfo,
    estimateCost,
    effectiveWebSearch,
    effectiveSystem,
    messagesForUpstream,
    modelParams,
    providerOptions,
    streamingEnabled,
    memory,
    varsWriteback,
    globalVarsWriteback,
    debugRequestSnapshot,
  } = prepared;
  // cache_control only for Claude models: others (Mistral) advertise caching
  // but 422 on the Anthropic block format.
  const provider = getProvider(apiKey, {
    injectCacheControl:
      modelInfo?.metadata.supportsCache === true && /claude/i.test(body.model),
  });

  const droppedParamsRef = { value: null as string | null };
  // Captured in onFinish; emitted in messageMetadata to seed request log row.
  const debugRef = {
    value: {
      requestId: null as string | null,
      responseHeaders: null as Record<string, string> | null,
    },
  };

  const streamStartedAt = Date.now();
  // Shared by onFinish (buffered path) + the finish frame (streamed path).
  const buildUsage = (inputTokens: number, outputTokens: number) => {
    const durationMs = Date.now() - streamStartedAt;
    return {
      inputTokens,
      outputTokens,
      cost: estimateCost(inputTokens, outputTokens),
      durationMs,
      tokensPerSecond:
        outputTokens > 0 && durationMs > 0
          ? outputTokens / (durationMs / 1000)
          : undefined,
    };
  };
  // Upstream request id + dropped-params ride response headers; capture from
  // whichever callback sees them first (finish-step beats onFinish on timing).
  const captureHeaders = (
    hdrs: Record<string, string> | null | undefined,
  ): void => {
    if (!hdrs) return;
    debugRef.value = {
      requestId: hdrs["x-oneapi-request-id"] ?? null,
      responseHeaders: hdrs,
    };
    const dropped = hdrs["x-newapi-dropped-params"];
    if (typeof dropped === "string" && dropped.length > 0) {
      droppedParamsRef.value = dropped;
    }
  };
  const result = streamText({
    // Lift inline <think> text into a proper reasoning part: UI renders it
    // collapsible, stripReasoningParts keeps it out of next turn's context.
    model: wrapLanguageModel({
      model: provider.chatModel(body.model),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    messages: await convertToModelMessages(messagesForUpstream),
    system: effectiveSystem,
    // Retries retryable errors only (429/5xx/network); 4xx surface verbatim (Risu parity).
    maxRetries: 2,
    ...modelParams,
    providerOptions,
    onFinish: ({ usage, response }) => {
      captureHeaders(response.headers);
      const u = buildUsage(usage.inputTokens ?? 0, usage.outputTokens ?? 0);
      captureServerEvent({
        event: "chat_stream_completed",
        request,
        userId,
        properties: {
          model: body.model,
          duration_ms: u.durationMs,
          input_tokens: u.inputTokens,
          output_tokens: u.outputTokens,
          tokens_per_second: u.tokensPerSecond,
          web_search: effectiveWebSearch,
          has_dropped_params: !!droppedParamsRef.value,
          is_guest: userId === GUEST_USER_ID,
          request_id: debugRef.value.requestId ?? undefined,
        },
      });
    },
    onError: ({ error }) => {
      captureServerEvent({
        event: "chat_stream_failed",
        request,
        userId,
        properties: {
          model: body.model,
          duration_ms: Date.now() - streamStartedAt,
          error_class:
            error instanceof Error ? error.constructor.name : "Unknown",
          error_message: errMessage(error).slice(0, 200),
          is_guest: userId === GUEST_USER_ID,
        },
      });
    },
  });

  // Server-generated assistant message id: shared by the UI stream (the
  // client persists the message under it) and the server-side request-log row,
  // so both sides key the log identically.
  const responseMessageId = uid();
  // ONE finish-metadata builder for both delivery paths: the streamed path's
  // finish frame and the buffered path's synthesized metadata chunk. Carries
  // usage/cost, writebacks (vars/globals/summary), the speaker tag, and the
  // request-log debug snapshot.
  const buildFinishMeta = (
    totalUsage: { inputTokens?: number; outputTokens?: number } | undefined,
  ): Record<string, unknown> => {
    const meta: Record<string, unknown> = {};
    if (droppedParamsRef.value) meta.droppedParams = droppedParamsRef.value;
    if (varsWriteback) meta.vars = varsWriteback;
    if (globalVarsWriteback) meta.globalVars = globalVarsWriteback;
    if (memory.summaryWriteback) meta.summary = memory.summaryWriteback;
    // Speaker tag for multi-character turns (Risu `saying`): per-message,
    // immune to the client-side speaking-atom clear race.
    if (body.speakingCharacterId)
      meta.speakingCharacterId = body.speakingCharacterId;
    const u = buildUsage(
      totalUsage?.inputTokens ?? 0,
      totalUsage?.outputTokens ?? 0,
    );
    if (u.inputTokens > 0 || u.outputTokens > 0) meta.usage = u;
    const debug = {
      ...debugRequestSnapshot,
      responseHeaders: debugRef.value.responseHeaders,
      droppedParams: droppedParamsRef.value,
      requestId: debugRef.value.requestId,
    };
    meta.debug = debug;
    // Cross-device copy for synced convs; the client no longer pushes logs up.
    persistRequestLogIfSynced(body.convId, responseMessageId, debug, u);
    return meta;
  };

  const userOptedOutOfStreaming = !streamingEnabled;

  if (!buffered && !userOptedOutOfStreaming) {
    return result.toUIMessageStreamResponse({
      generateMessageId: () => responseMessageId,
      messageMetadata: ({ part }) => {
        // `finish-step` carries response.headers synchronously; onFinish races stream end.
        if (part.type === "finish-step") {
          captureHeaders(part.response.headers);
          return undefined;
        }
        if (part.type === "finish") {
          // Usage off the part; onFinish races UI stream end.
          const meta = buildFinishMeta(part.totalUsage);
          return Object.keys(meta).length > 0 ? meta : undefined;
        }
        return undefined;
      },
    });
  }

  // Buffered (media follow-ups + streaming-off): same metadata, synthesized
  // after the full text resolves so usage/cost/writebacks are not lost.
  return handleBufferedStream(
    result,
    body,
    mediaType ?? "text",
    async () => buildFinishMeta(await result.totalUsage),
    responseMessageId,
  );
}
