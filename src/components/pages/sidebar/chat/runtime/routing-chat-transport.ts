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

// A prefill that ends inside an open <think> tag (the force-thinking trick) makes
// the model stream its reasoning as plain content with no opening tag in the
// RESPONSE - the tag lives in the request. The extractor must then start in
// reasoning mode or the whole chain of thought lands in the visible reply.
function prefillOpensThink(
  messages: ReadonlyArray<{
    role: string;
    parts?: ReadonlyArray<{ type: string; text?: string }>;
  }>,
): boolean {
  const last = messages.at(-1);
  if (last?.role !== "assistant") return false;
  const text = (last.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => p.text ?? "")
    .join("");
  const open = text.lastIndexOf("<think>");
  return open !== -1 && !text.includes("</think>", open);
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
      middleware: extractReasoningMiddleware({
        tagName: "think",
        startWithReasoning: prefillOpensThink(prepared.messagesForUpstream),
      }),
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
      const isEmptyStream = detail.message
        .toLowerCase()
        .includes("no output generated");
      analytics.chat.streamFailed({
        error_type: isEmptyStream
          ? "empty_stream"
          : classifyStreamError(detail),
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

  // streamText exposes terminal promises (result.text / finishReason) that ai-sdk
  // resolves in the background. When a flaky free model closes with zero content,
  // ai-sdk rejects them with AI_NoOutputGeneratedError; nothing here awaits them,
  // so it lands as an UNHANDLED rejection (bypassing onError + posthog's
  // before_send drop). Mark them handled - the error already surfaced to the user
  // via toUIMessageStream's onError below and to us via streamText onError above.
  void Promise.resolve(result.text).catch(() => {});
  void Promise.resolve(result.finishReason).catch(() => {});

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

  // ALWAYS route the model stream through a wrapping createUIMessageStream writer,
  // even with no start alerts. A zero-content close makes ai-sdk reject the UI
  // stream's internal flush promise with AI_NoOutputGeneratedError; returning the
  // raw stream leaks that as an unhandled rejection (vercel/ai#6879). writer.merge
  // funnels the source stream's errors into this stream's own onError instead, so
  // the error becomes a data part the client renders rather than a window-level
  // unhandled rejection. The real cause is still reported via streamText onError.
  return createUIMessageStream({
    onError: (error) => streamErrorText(error),
    execute: ({ writer }) => {
      for (const a of prepared.startAlerts) {
        writer.write({ type: "data-alert", data: a, transient: true });
      }
      writer.merge(uiStream as ReadableStream<UIMessageChunk>);
    },
  }) as ReadableStream<UIMessageChunk>;
}

export function makeRoutingTransport(
  getConvId: () => string | null,
): ChatTransport<ChatUIMessage> {
  const mediaTransport = new DefaultChatTransport<ChatUIMessage>({
    api: "/api/ai/chat/stream",
    body: () => buildChatRequestBody(getConvId),
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
      getConvId,
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
