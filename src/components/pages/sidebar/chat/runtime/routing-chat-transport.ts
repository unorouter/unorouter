"use client";

import {
  convertToModelMessages,
  createUIMessageStream,
  DefaultChatTransport,
  extractReasoningMiddleware,
  streamText,
  wrapLanguageModel,
  type ChatTransport,
  type UIMessageChunk,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatUIMessage } from "@/lib/types";
import { uid } from "@/lib/utils/base";
import { classifyStreamError, extractErrorDetail } from "@/lib/utils/client";
import { analytics } from "@/lib/analytics";
import {
  prepareChatRequest,
  type PreparedChatRequest,
} from "@/lib/ai/chat/pipeline/prepare.service";
import type { AssemblerDeps } from "@/lib/ai/chat/pipeline/deps";
import {
  buildFinishMeta,
  createMetaCollector,
  makeBuildUsage,
} from "@/lib/ai/chat/pipeline/finish-meta";
import {
  hasBodyMutation,
  makeBodyMutationFetch,
} from "@/lib/ai/chat/provider-mutations";
import type { TokenizerRef } from "@/lib/ai/chat/tokenizer";
import { chatModelAtom, chatStore, localUserIdAtom } from "@/store/chat-store";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { isMediaType, type ProcessedModel } from "@/lib/api/pricing";
import { buildChatRequestBody } from "./chat-transport";
import { resolveModelTargetFromStore } from "./resolve-model-target";

type SendOptions = Parameters<ChatTransport<ChatUIMessage>["sendMessages"]>[0];

function streamErrorText(error: unknown): string {
  const detail = extractErrorDetail(error);
  const tag = [detail.status ? `HTTP ${detail.status}` : null, detail.code]
    .filter(Boolean)
    .join(" ");
  return tag && !detail.message.includes(tag)
    ? `${detail.message} (${tag})`
    : detail.message;
}

function isMediaModel(model: string): boolean {
  const data = getQueryClient().getQueryData(queryKeys.pricing()) as
    { models?: ProcessedModel[] } | undefined;
  return isMediaType(data?.models?.find((m) => m.name === model)?.type);
}

async function runClientStream(args: {
  apiKey: string;
  baseURL: string;
  model: string;
  deps: AssemblerDeps;
  options: SendOptions;
  getConvId: () => string | null;
  tokenizer?: TokenizerRef;
}): Promise<ReadableStream<UIMessageChunk>> {
  const userId = chatStore.get(localUserIdAtom);
  const fields = await buildChatRequestBody(args.getConvId);
  const body = {
    ...fields,
    model: args.model,
    messages: args.options.messages,
    ...(args.tokenizer ? { tokenizer: args.tokenizer } : {}),
  };
  const prepared: PreparedChatRequest = await prepareChatRequest(
    args.apiKey,
    body,
    userId,
    args.deps,
    args.options.abortSignal,
  );

  const collector = createMetaCollector();
  const startedAt = Date.now();
  const buildUsage = makeBuildUsage(prepared, startedAt, Date.now);
  const finishMeta = (
    totalUsage: { inputTokens?: number; outputTokens?: number } | undefined,
  ) =>
    buildFinishMeta({
      prepared,
      collector,
      buildUsage,
      totalUsage,
      speakingCharacterId: body.speakingCharacterId,
    });

  if (prepared.stopRequested) {
    return createUIMessageStream({
      execute: ({ writer }) => {
        for (const a of prepared.startAlerts) {
          writer.write({ type: "data-alert", data: a, transient: true });
        }
      },
    });
  }

  const sdk = createOpenAICompatible({
    name: "unorouter",
    baseURL: args.baseURL,
    apiKey: args.apiKey,
    ...(hasBodyMutation(prepared.bodyMutations)
      ? { fetch: makeBodyMutationFetch(prepared.bodyMutations) }
      : {}),
  });

  const result = streamText({
    model: wrapLanguageModel({
      model: sdk.chatModel(args.model),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    messages: await convertToModelMessages(prepared.messagesForUpstream),
    system: prepared.effectiveSystem,
    maxRetries: 0,
    // Streaming errors (mid-stream upstream 5xx, malformed SSE, or a flaky free
    // model closing with zero content -> AI_NoOutputGeneratedError at flush) are
    // delivered here, OFF the send-promise, so useChat's onError never sees them.
    // Capture the real cause as chat_stream_failed with the upstream request id
    // + model instead of swallowing it silently.
    onError: (event) => {
      const detail = extractErrorDetail(event.error);
      const isEmptyStream =
        detail.message.toLowerCase().includes("no output generated");
      analytics.chat.streamFailed({
        error_type: isEmptyStream ? "empty_stream" : classifyStreamError(detail),
        status: detail.status ?? null,
        code: detail.code ?? null,
        model: args.model,
        request_id: collector.requestId,
        message: detail.message.slice(0, 300),
      });
    },
    ...prepared.modelParams,
    providerOptions: prepared.providerOptions,
    ...(args.options.abortSignal
      ? { abortSignal: args.options.abortSignal }
      : {}),
  });

  const responseMessageId = uid();
  const uiStream = result.toUIMessageStream({
    generateMessageId: () => responseMessageId,
    onError: (error) => streamErrorText(error),
    messageMetadata: ({ part }) => {
      if (part.type === "finish-step") {
        collector.captureHeaders(part.response.headers);
        return undefined;
      }
      if (part.type === "finish") {
        const meta = finishMeta(part.totalUsage);
        return Object.keys(meta).length > 0 ? meta : undefined;
      }
      return undefined;
    },
  });

  if (prepared.startAlerts.length === 0) {
    return uiStream as ReadableStream<UIMessageChunk>;
  }
  return createUIMessageStream({
    execute: ({ writer }) => {
      for (const a of prepared.startAlerts) {
        writer.write({ type: "data-alert", data: a, transient: true });
      }
      writer.merge(uiStream as ReadableStream<UIMessageChunk>);
    },
  });
}

export function makeRoutingTransport(
  getConvId: () => string | null,
): ChatTransport<ChatUIMessage> {
  const getConvIdRef = { current: getConvId };

  const mediaTransport = new DefaultChatTransport<ChatUIMessage>({
    api: "/api/ai/chat/stream",
    body: () => buildChatRequestBody(getConvIdRef.current),
  });

  const sendText = async (
    modelId: string,
    options: SendOptions,
  ): Promise<ReadableStream<UIMessageChunk>> => {
    const target = await resolveModelTargetFromStore(modelId);
    return runClientStream({
      apiKey: target.apiKey,
      baseURL: target.baseURL,
      model: target.model,
      deps: target.deps,
      options,
      getConvId: getConvIdRef.current,
      ...(target.tokenizer ? { tokenizer: target.tokenizer } : {}),
    });
  };

  return {
    sendMessages: (options) => {
      const modelId = chatStore.get(chatModelAtom) ?? "";
      if (isMediaModel(modelId)) return mediaTransport.sendMessages(options);
      return sendText(modelId, options);
    },
    reconnectToStream: async () => null,
  };
}
