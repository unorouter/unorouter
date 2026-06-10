import { isMediaModel } from "@/lib/api/pricing-cache";
import { GUEST_USER_ID } from "@/lib/config/constants";
import { captureServerEvent } from "@/lib/posthog-server";
import { errMessage } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getProvider } from "@/server/constants";
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
import { GEMINI_SAFETY_OFF } from "./stream/transforms";

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
    effectiveMaxOutputTokens,
    effectiveSystem,
    messagesForUpstream,
    assembled,
    memory,
    varsWriteback,
    globalVarsWriteback,
    debugRequestSnapshot,
  } = prepared;
  // Inject Anthropic cache_control markers only for Claude models that advertise
  // cache support. supportsCache alone is not enough: other providers (Mistral)
  // advertise caching but their APIs 422 on the Anthropic block format.
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
  const usageRef = { value: null as ReturnType<typeof buildUsage> | null };
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
  // Spread-only-when-set: strip undefined keys so absent != explicit-undefined.
  const defined = <T extends Record<string, unknown>>(o: T): Partial<T> =>
    Object.fromEntries(
      Object.entries(o).filter(([, v]) => v !== undefined),
    ) as Partial<T>;

  const result = streamText({
    // Models that emit reasoning inline as `<think>...` text (GLM OpenAI-compat,
    // R1 distills) get it lifted into a proper reasoning part: UI renders it
    // collapsible and stripReasoningParts keeps it out of the next turn's context.
    model: wrapLanguageModel({
      model: provider.chatModel(body.model),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    messages: await convertToModelMessages(messagesForUpstream),
    system: effectiveSystem,
    // Risu requestRetrys parity: bounded retries on RETRYABLE errors only
    // (429/5xx/network, exponential backoff). Deterministic 4xx surface
    // verbatim on the first attempt.
    maxRetries: 2,
    ...defined({
      maxOutputTokens: effectiveMaxOutputTokens || undefined,
      temperature: assembled.sampling.temperature,
      topP: assembled.sampling.topP,
      topK: assembled.sampling.topK,
      frequencyPenalty: assembled.sampling.frequencyPenalty,
      presencePenalty: assembled.sampling.presencePenalty,
    }),
    // extraBody first: sliders/reasoning win on key collision.
    providerOptions: {
      openai: {
        ...(assembled.extraBody ?? {}),
        ...defined({
          min_p: assembled.sampling.minP,
          top_a: assembled.sampling.topA,
          repetition_penalty: assembled.sampling.repetitionPenalty,
          reasoning_effort: assembled.reasoningEffort,
          // Gemini-only: threshold=OFF (stronger than BLOCK_NONE); no-op elsewhere.
          safetySettings: assembled.flags.geminiBlockOff
            ? GEMINI_SAFETY_OFF
            : undefined,
          // Provider pin (OpenRouter shape). Passed through; honored only by
          // upstream channels that route on it, a harmless no-op otherwise.
          provider: assembled.providerRouting,
        }),
      },
    },
    onFinish: ({ usage, response }) => {
      captureHeaders(response.headers);
      const u = buildUsage(usage.inputTokens ?? 0, usage.outputTokens ?? 0);
      usageRef.value = u;
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

  const userOptedOutOfStreaming = !assembled.streamingEnabled;

  if (!buffered && !userOptedOutOfStreaming) {
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        // `finish-step` carries response.headers synchronously; onFinish races stream end.
        if (part.type === "finish-step") {
          captureHeaders(part.response.headers);
          return undefined;
        }
        if (part.type === "finish") {
          const meta: Record<string, unknown> = {};
          if (droppedParamsRef.value)
            meta.droppedParams = droppedParamsRef.value;
          if (varsWriteback) meta.vars = varsWriteback;
          if (globalVarsWriteback) meta.globalVars = globalVarsWriteback;
          if (memory.summaryWriteback) meta.summary = memory.summaryWriteback;
          // Speaker tag for multi-character turns (Risu `saying`): per-message,
          // immune to the client-side speaking-atom clear race.
          if (body.speakingCharacterId)
            meta.speakingCharacterId = body.speakingCharacterId;
          // Read usage off part; onFinish races UI stream end.
          const total = part.totalUsage;
          const u = buildUsage(
            total?.inputTokens ?? 0,
            total?.outputTokens ?? 0,
          );
          if (u.inputTokens > 0 || u.outputTokens > 0) meta.usage = u;
          meta.debug = {
            ...debugRequestSnapshot,
            responseHeaders: debugRef.value.responseHeaders,
            droppedParams: droppedParamsRef.value,
            requestId: debugRef.value.requestId,
          };
          return Object.keys(meta).length > 0 ? meta : undefined;
        }
        return undefined;
      },
    });
  }

  return handleBufferedStream(result, body, mediaType ?? "text");
}
