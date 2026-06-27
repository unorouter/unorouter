"use client";

// Routing transport: BOTH paths run the full chat engine in the browser (assemble + streamText). The only
// difference is the endpoint + token:
//   - custom model -> the user's own endpoint, the user's key (never touches our server)
//   - default model -> a thin same-origin proxy (/api/ai/chat/forward) that injects the resolved token
//     server-side and pipes the SSE to new-api; the browser holds no token.
// Both emit the SAME UIMessage finish-meta, so the history adapter persists usage/debug/writebacks identically.

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
import { errMessage, uid } from "@/lib/utils/base";
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
import {
  isCustomModelId,
  normalizeBaseUrl,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import type { TokenizerRef } from "@/lib/ai/chat/tokenizer";
import { readLocalCustomProvider } from "@/lib/db/client/data/custom-providers";
import { chatModelAtom, chatStore, localUserIdAtom } from "@/store/chat-store";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { isMediaType, type ProcessedModel } from "@/lib/api/pricing";
import { buildChatRequestBody } from "./chat-transport";
import { buildClientDeps } from "./client-deps";
import { buildDefaultClientDeps } from "./default-deps";

type SendOptions = Parameters<ChatTransport<ChatUIMessage>["sendMessages"]>[0];

// Media models (image/video/audio/embedding) are not OpenAI chat-completions: they stay on the server route
// (/stream) which dispatches the right upstream endpoint + runs Creem moderation. The pricing query is already
// in the React Query cache (staleTime Infinity), so no separate TTL cache is needed client-side.
function isMediaModel(model: string): boolean {
  const data = getQueryClient().getQueryData(queryKeys.pricing()) as
    | { models?: ProcessedModel[] }
    | undefined;
  return isMediaType(data?.models?.find((m) => m.name === model)?.type);
}

// Shared assemble-and-stream used by both branches. The caller supplies the endpoint (baseURL), the token
// (apiKey - "proxy" placeholder for the default path; the proxy injects the real one), the real upstream
// model name, and the AssemblerDeps. body mutations (claude cache, deepseek) ride the fetch wrapper.
async function runClientStream(args: {
  apiKey: string;
  baseURL: string;
  model: string;
  deps: AssemblerDeps;
  options: SendOptions;
  getConvId: () => string | null;
  // Per-model tokenizer for budget counting (custom path). Omitted on the default path -> inferred from model.
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

  // V1 stop effect (Risu stopSending): answer an empty stream with just the transient alerts.
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
    ...prepared.modelParams,
    providerOptions: prepared.providerOptions,
    ...(args.options.abortSignal
      ? { abortSignal: args.options.abortSignal }
      : {}),
  });

  const responseMessageId = uid();
  const uiStream = result.toUIMessageStream({
    generateMessageId: () => responseMessageId,
    onError: (error) => errMessage(error),
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
  // Transient start-trigger alerts ride ahead of the model stream.
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

  // Media models stay on the server route: it dispatches image/video/audio/embedding + runs moderation.
  const mediaTransport = new DefaultChatTransport<ChatUIMessage>({
    api: "/api/ai/chat/stream",
    body: () => buildChatRequestBody(getConvIdRef.current),
  });

  const sendCustom = async (
    modelId: string,
    options: SendOptions,
  ): Promise<ReadableStream<UIMessageChunk>> => {
    const userId = chatStore.get(localUserIdAtom);
    const parsed = parseCustomModelId(modelId);
    if (!parsed) throw new Error("invalid custom model id");
    const provider = await readLocalCustomProvider(userId, parsed.providerId);
    if (!provider) throw new Error("custom provider not found");
    const modelRow = provider.models.find((m) => m.key === parsed.modelKey);
    return runClientStream({
      apiKey: provider.apiKey,
      baseURL: normalizeBaseUrl(provider.baseUrl),
      model: parsed.modelKey,
      deps: buildClientDeps(userId, provider),
      options,
      getConvId: getConvIdRef.current,
      tokenizer: (modelRow?.tokenizer as TokenizerRef | undefined) ?? undefined,
    });
  };

  const sendDefault = async (
    model: string,
    options: SendOptions,
  ): Promise<ReadableStream<UIMessageChunk>> => {
    const userId = chatStore.get(localUserIdAtom);
    return runClientStream({
      // The proxy injects the real token from cookies; the SDK only needs a truthy placeholder. ABSOLUTE
      // same-origin URL because the SDK does `new URL(baseURL + path)` (a relative base throws).
      apiKey: "proxy",
      baseURL: `${window.location.origin}/api/ai/chat/forward`,
      model,
      deps: buildDefaultClientDeps(userId),
      options,
      getConvId: getConvIdRef.current,
    });
  };

  return {
    sendMessages: (options) => {
      // Snapshot the model once: the routing decision and the async build must agree if the atom changes mid-send.
      const modelId = chatStore.get(chatModelAtom) ?? "";
      if (isCustomModelId(modelId)) return sendCustom(modelId, options);
      // Media -> server route (moderation + per-modality dispatch); text -> client engine via the proxy.
      if (isMediaModel(modelId)) return mediaTransport.sendMessages(options);
      return sendDefault(modelId, options);
    },
    // No server-side stream to reconnect to (client owns the stream). Resume is not supported.
    reconnectToStream: async () => null,
  };
}
