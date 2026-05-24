import { getPricingSummary, isMediaModel } from "@/lib/api/pricing-cache";
import { FREE_MODEL_OUTPUT_CAP } from "@/lib/config/constants";
import { captureServerEvent } from "@/lib/posthog-server";
import { logger } from "@/lib/utils/logger";
import { ChatContext, StreamOverrides } from "@/lib/validation/chat";
import { getProvider } from "@/server/constants";
import { convertToModelMessages, streamText } from "ai";
import {
  assembleForStream,
  assembleFromOverrides,
} from "./augmentation/prompt-assembler.service";
import {
  buildContextFromClient,
  loadConvContext,
} from "./augmentation/prompt-assembler/conv-context";
import {
  formatSearchContext,
  needsWebSearch,
  searchTavily,
} from "./augmentation/tavily.service";
import {
  handleBufferedStream,
  handleImageStream,
  handleVideoTaskStream,
} from "./stream/media-stream";
import {
  appendPrefill,
  collectRecentUserTexts,
  expandMessageMacros,
  extractLastUserText,
  GEMINI_SAFETY_OFF,
  inlinePdfText,
  mergeAlternateRoles,
  prependUserStub,
  spliceDepthInjections,
  stripSystemRole,
  type StreamMessages,
} from "./stream/transforms";

type StreamBody = {
  model: string;
  messages: StreamMessages;
  convId?: string | null;
  webSearch?: boolean;
  overrides?: StreamOverrides;
  chatContext?: ChatContext;
};

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
      is_guest: userId === 0,
    },
  });

  if (mediaType === "image") {
    return handleImageStream(apiKey, body, userId);
  }

  if (mediaType === "video") {
    return handleVideoTaskStream(apiKey, body, userId);
  }

  // IDB-first: client chatContext avoids Turso RP reads; fall back to Turso for guests/legacy.
  const convCtx = body.chatContext
    ? buildContextFromClient(body.chatContext)
    : body.convId
      ? await loadConvContext(body.convId)
      : null;
  // Toolbar toggle OR'd with conv default; web search paid-only so guests off.
  const effectiveWebSearch =
    userId !== 0 &&
    (!!body.webSearch || (convCtx?.settings.webSearchEnabled ?? false));

  let searchSystemMessage: string | undefined;
  if (effectiveWebSearch) {
    const lastUserText = extractLastUserText(body.messages);
    if (lastUserText) {
      const shouldSearch = await needsWebSearch(apiKey, lastUserText);
      if (shouldSearch) {
        const engine = convCtx?.settings.webSearchEngine ?? "auto";
        const contextSize = convCtx?.settings.webSearchContextSize ?? "medium";
        logger.info("Web search triggered", {
          context: "stream.tavily",
          query: lastUserText.slice(0, 100),
          engine,
          contextSize,
        });
        const searchResult = await searchTavily(lastUserText);
        captureServerEvent({
          event: "chat_web_search_executed",
          request,
          userId,
          properties: {
            engine,
            context_size: contextSize,
            result_count: searchResult?.results.length ?? 0,
            had_results: (searchResult?.results.length ?? 0) > 0,
          },
        });
        if (searchResult && searchResult.results.length > 0) {
          searchSystemMessage = formatSearchContext(searchResult);
        }
      }
    }
  }

  const provider = getProvider(apiKey);
  const messagesWithPdfText = await inlinePdfText(body.messages);

  const recentUserTexts = collectRecentUserTexts(messagesWithPdfText);
  const assembled =
    body.convId && convCtx
      ? await assembleForStream(
          body.convId,
          recentUserTexts,
          searchSystemMessage,
          convCtx,
        )
      : assembleFromOverrides(body.overrides, searchSystemMessage);

  const slicedMessages =
    assembled.chatMemory > 0
      ? messagesWithPdfText.slice(-assembled.chatMemory)
      : messagesWithPdfText;

  const depthInjections = [
    ...assembled.atDepthEntries,
    ...(assembled.authorNote ? [assembled.authorNote] : []),
  ];
  const splicedMessages =
    depthInjections.length > 0
      ? spliceDepthInjections(slicedMessages, depthInjections)
      : slicedMessages;
  let processedMessages = expandMessageMacros(splicedMessages, assembled.vars);

  // ORDER LOCKED, do not reshuffle:
  //  1. noSystemRole BEFORE merge: stripped system-as-user must be eligible
  //     to collapse with an adjacent user during merge.
  //  2. prefill BEFORE merge: prefill is assistant role; if user ended on
  //     assistant, mergeAlternateRoles will collapse them.
  //     skipPrefillIfLastIsAssistant opts out.
  //  3. mergeAlternateRoles AFTER prefill: output strictly
  //     user/assistant/user/assistant.
  //  4. prependUserStub LAST so merge cannot fold the stub into a following
  //     user message.
  if (assembled.flags.noSystemRole) {
    processedMessages = stripSystemRole(processedMessages);
  }
  const lastIsAssistant =
    processedMessages[processedMessages.length - 1]?.role === "assistant";
  const prefillBlocked =
    assembled.flags.skipPrefillIfLastIsAssistant &&
    assembled.flags.forceAlternateRoles &&
    lastIsAssistant;
  if (assembled.prefill && !prefillBlocked) {
    processedMessages = appendPrefill(processedMessages, assembled.prefill);
  }
  if (assembled.flags.forceAlternateRoles) {
    processedMessages = mergeAlternateRoles(processedMessages);
  }
  if (assembled.flags.mustStartWithUserInput) {
    processedMessages = prependUserStub(processedMessages);
  }
  const messagesForUpstream = processedMessages;

  // Captured at emit time + persisted by client as a request log row so users
  // can verify what hit the upstream (sampler/sys-prompt debugging, JB
  // verification, preset reproduction). Mirrors RisuAI's "Logs" panel.
  const debugRequestSnapshot = {
    requestBody: {
      model: body.model,
      messages: body.messages,
      chatContext: body.chatContext,
      overrides: body.overrides,
      webSearch: body.webSearch,
      convId: body.convId,
    },
    assembledSystem: assembled.system ?? null,
    finalMessages: messagesForUpstream,
  };

  const modelInfo = (await getPricingSummary()).models.find(
    (m) => m.name === body.model,
  );
  // Free models often advertise inflated maxOutputTokens; cap to a safe budget.
  const droppedParamsRef: { value: string | null } = { value: null };
  // Captured in onFinish; emitted in messageMetadata to seed request log row.
  const debugRef: {
    value: {
      requestId: string | null;
      responseHeaders: Record<string, string> | null;
    };
  } = { value: { requestId: null, responseHeaders: null } };
  const usageRef: {
    value: {
      inputTokens: number;
      outputTokens: number;
      cost: number;
      durationMs: number;
      tokensPerSecond?: number;
    } | null;
  } = { value: null };

  const presetMaxOut = assembled.sampling.maxOutputTokens;
  const modelMaxOut = modelInfo?.metadata.maxOutputTokens;
  const effectiveMaxOutputTokens = modelInfo?.isFree
    ? Math.min(
        presetMaxOut ?? modelMaxOut ?? FREE_MODEL_OUTPUT_CAP,
        FREE_MODEL_OUTPUT_CAP,
      )
    : (presetMaxOut ?? modelMaxOut);
  const streamStartedAt = Date.now();
  const result = streamText({
    model: provider.chatModel(body.model),
    messages: await convertToModelMessages(messagesForUpstream),
    system: assembled.system,
    // new-api performs cross-group/key retries; disable SDK aggregation so
    // the user sees real upstream errors verbatim.
    maxRetries: 0,
    ...(effectiveMaxOutputTokens && {
      maxOutputTokens: effectiveMaxOutputTokens,
    }),
    ...(assembled.sampling.temperature !== undefined && {
      temperature: assembled.sampling.temperature,
    }),
    ...(assembled.sampling.topP !== undefined && {
      topP: assembled.sampling.topP,
    }),
    ...(assembled.sampling.topK !== undefined && {
      topK: assembled.sampling.topK,
    }),
    ...(assembled.sampling.frequencyPenalty !== undefined && {
      frequencyPenalty: assembled.sampling.frequencyPenalty,
    }),
    ...(assembled.sampling.presencePenalty !== undefined && {
      presencePenalty: assembled.sampling.presencePenalty,
    }),
    // extraBody first: sliders/reasoning win on key collision.
    providerOptions: {
      openai: {
        ...(assembled.extraBody ?? {}),
        ...(assembled.sampling.minP !== undefined && {
          min_p: assembled.sampling.minP,
        }),
        ...(assembled.sampling.topA !== undefined && {
          top_a: assembled.sampling.topA,
        }),
        ...(assembled.sampling.repetitionPenalty !== undefined && {
          repetition_penalty: assembled.sampling.repetitionPenalty,
        }),
        ...(assembled.reasoningEffort && {
          reasoning_effort: assembled.reasoningEffort,
        }),
        // Gemini-only: threshold=OFF (stronger than BLOCK_NONE); no-op elsewhere.
        ...(assembled.flags.geminiBlockOff && {
          safetySettings: GEMINI_SAFETY_OFF,
        }),
      },
    },
    onFinish: ({ usage, response }) => {
      const durationMs = Date.now() - streamStartedAt;
      const outputTokens = usage.outputTokens ?? 0;
      const inputTokens = usage.inputTokens ?? 0;
      const tokensPerSecond =
        outputTokens > 0 && durationMs > 0
          ? outputTokens / (durationMs / 1000)
          : undefined;
      const requestId = response.headers?.["x-oneapi-request-id"] ?? undefined;
      debugRef.value = {
        requestId: requestId ?? null,
        responseHeaders: response.headers ?? null,
      };
      // Cost backfilled later from upstream headers; client needs tokens now for its local row.
      usageRef.value = {
        inputTokens,
        outputTokens,
        cost: 0,
        durationMs,
        tokensPerSecond,
      };
      const dropped = response.headers?.["x-newapi-dropped-params"];
      if (typeof dropped === "string" && dropped.length > 0) {
        droppedParamsRef.value = dropped;
      }
      captureServerEvent({
        event: "chat_stream_completed",
        request,
        userId,
        properties: {
          model: body.model,
          duration_ms: durationMs,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          tokens_per_second: tokensPerSecond,
          web_search: effectiveWebSearch,
          has_dropped_params: !!droppedParamsRef.value,
          is_guest: userId === 0,
          request_id: requestId,
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
          error_message:
            error instanceof Error
              ? error.message.slice(0, 200)
              : String(error).slice(0, 200),
          is_guest: userId === 0,
        },
      });
    },
  });

  const userOptedOutOfStreaming = !assembled.streamingEnabled;

  if (!buffered && !userOptedOutOfStreaming) {
    return result.toUIMessageStreamResponse({
      messageMetadata: ({ part }) => {
        // `finish-step` carries `response.headers` synchronously inside the
        // metadata callback's emit window; `onFinish` (sdk) races UI stream
        // end and would land null in the `debug` emit below.
        if (part.type === "finish-step") {
          const hdrs = part.response.headers ?? null;
          if (hdrs) {
            debugRef.value = {
              requestId: hdrs["x-oneapi-request-id"] ?? null,
              responseHeaders: hdrs,
            };
            const dropped = hdrs["x-newapi-dropped-params"];
            if (typeof dropped === "string" && dropped.length > 0) {
              droppedParamsRef.value = dropped;
            }
          }
          return undefined;
        }
        if (part.type === "finish") {
          const meta: Record<string, unknown> = {};
          if (droppedParamsRef.value)
            meta.droppedParams = droppedParamsRef.value;
          // streamText.onFinish races with UI stream finish; read usage off
          // the part directly so the message-metadata frame ships tokens.
          const total = part.totalUsage;
          const durationMs = Date.now() - streamStartedAt;
          const inputTokens = total?.inputTokens ?? 0;
          const outputTokens = total?.outputTokens ?? 0;
          const tokensPerSecond =
            outputTokens > 0 && durationMs > 0
              ? outputTokens / (durationMs / 1000)
              : undefined;
          if (inputTokens > 0 || outputTokens > 0) {
            meta.usage = {
              inputTokens,
              outputTokens,
              cost: 0,
              durationMs,
              tokensPerSecond,
            };
          }
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
