import { isMediaModel } from "@/lib/api/pricing-cache";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { captureServerEvent } from "@/lib/posthog-server";
import { errMessage, uid } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getProvider } from "@/server/constants";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
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
} from "./media/media-stream";
import {
  prepareChatRequest,
  type StreamBody,
} from "./pipeline/prepare.service";

export async function streamChat(
  apiKey: string,
  body: StreamBody,
  request: Request,
  userId: number,
) {
  const { buffered, mediaType } = await isMediaModel(body.model);

      // Group resolution: prefer the top-level toolbar group, fall back to conv settings (a new chat nulls the atom while its row already has a group).
  const settingsGroup = (
    body.chatContext?.settings as { group?: string | null } | undefined
  )?.group;
  const resolvedGroup = body.group ?? settingsGroup ?? null;
  body.group = resolvedGroup;

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
  // V1 `stop` effect (Risu stopSending): answer an empty UI stream, no upstream call.
  if (prepared.stopRequested) {
    const stopStream = createUIMessageStream({
      execute: ({ writer }) => {
        for (const a of prepared.startAlerts) {
          writer.write({
            type: "data-alert",
            data: a,
            transient: true,
          });
        }
      },
    });
    return createUIMessageStreamResponse({ stream: stopStream });
  }
      // cacheControl flag limits cache_control to Claude: others advertise caching but 422 on the Anthropic block format.
  const provider = getProvider(apiKey, prepared.bodyMutations);

  // Per-request group override; new-api reads X-Group. Omit for null/auto.
  const groupHeaders =
    body.group && body.group !== "auto" ? { "X-Group": body.group } : undefined;

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
      cost: prepared.estimateCost(inputTokens, outputTokens),
      durationMs,
      tokensPerSecond:
        outputTokens > 0 && durationMs > 0
          ? outputTokens / (durationMs / 1000)
          : undefined,
    };
  };
      // Upstream request id + dropped-params ride response headers; capture from whichever callback sees them first.
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
        // Lift inline <think> text into a reasoning part: UI renders it collapsible, stripReasoningParts keeps it out of next turn.
    model: wrapLanguageModel({
      model: provider.chatModel(body.model),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    messages: await convertToModelMessages(prepared.messagesForUpstream),
    system: prepared.effectiveSystem,
    // Retries retryable errors only (429/5xx/network); 4xx surface verbatim (Risu parity).
    maxRetries: 2,
    ...(groupHeaders ? { headers: groupHeaders } : {}),
    ...prepared.modelParams,
    providerOptions: prepared.providerOptions,
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
          web_search: prepared.effectiveWebSearch,
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

      // Server-generated id shared by the UI stream and the request-log row, so both sides key the log identically.
  const responseMessageId = uid();
      // One finish-metadata builder for both delivery paths (streamed finish frame, buffered synthesized chunk).
  const buildFinishMeta = (
    totalUsage: { inputTokens?: number; outputTokens?: number } | undefined,
  ): Record<string, unknown> => {
    const meta: Record<string, unknown> = {};
    if (droppedParamsRef.value) meta.droppedParams = droppedParamsRef.value;
    if (prepared.varsWriteback) meta.vars = prepared.varsWriteback;
    if (prepared.globalVarsWriteback)
      meta.globalVars = prepared.globalVarsWriteback;
    if (prepared.memory.summaryWriteback)
      meta.summary = prepared.memory.summaryWriteback;
    if (prepared.inlayMedia.length > 0) meta.inlayMedia = prepared.inlayMedia;
    // Per-message speaker tag (Risu `saying`), immune to the speaking-atom clear race.
    if (body.speakingCharacterId)
      meta.speakingCharacterId = body.speakingCharacterId;
    const u = buildUsage(
      totalUsage?.inputTokens ?? 0,
      totalUsage?.outputTokens ?? 0,
    );
    if (u.inputTokens > 0 || u.outputTokens > 0) meta.usage = u;
    const debug = {
      ...prepared.debugRequestSnapshot,
      responseHeaders: debugRef.value.responseHeaders,
      droppedParams: droppedParamsRef.value,
      requestId: debugRef.value.requestId,
    };
    meta.debug = debug;
    return meta;
  };

  const userOptedOutOfStreaming = !prepared.streamingEnabled;

  if (!buffered && !userOptedOutOfStreaming) {
    const uiStream = result.toUIMessageStream({
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
    // Transient start-trigger alerts ride ahead of the model stream.
    if (prepared.startAlerts.length > 0) {
      const merged = createUIMessageStream({
        execute: ({ writer }) => {
          for (const a of prepared.startAlerts) {
            writer.write({ type: "data-alert", data: a, transient: true });
          }
          writer.merge(uiStream);
        },
      });
      return createUIMessageStreamResponse({ stream: merged });
    }
    return createUIMessageStreamResponse({ stream: uiStream });
  }

      // Buffered (media follow-ups + streaming-off): same metadata, synthesized after the full text resolves so usage/cost/writebacks survive.
  return handleBufferedStream(
    result,
    body,
    mediaType ?? "text",
    async () => buildFinishMeta(await result.totalUsage),
    responseMessageId,
  );
}
