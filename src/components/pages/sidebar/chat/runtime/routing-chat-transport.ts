"use client";

import {
  convertToModelMessages,
  createUIMessageStream,
  DefaultChatTransport,
  extractReasoningMiddleware,
  streamText,
  toUIMessageStream,
  wrapLanguageModel,
  type ChatTransport,
  type UIMessageChunk,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatUIMessage } from "@/lib/types";
import { uid } from "@/lib/utils/base";
import { classifyStreamError, extractErrorDetail } from "@/lib/utils/client";
import { analytics } from "@/lib/analytics";
import { coalesceReasoningMiddleware } from "@/lib/ai/chat/coalesce-reasoning-middleware";
import { prefillThinkMiddleware } from "@/lib/ai/chat/prefill-think-middleware";
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
import { CHAT_PROVIDER_NAME } from "@/lib/config/constants";
import {
  fingerprintText,
  logChatDebug,
  stashOutgoingRequest,
} from "@/lib/utils/chat-debug-log";
import {
  chatGroupAtom,
  groupByModelAtom,
  chatModelAtom,
  chatStore,
} from "@/store/chat-store";
import { authUserId } from "@/hooks/auth/auth-hook";
import getQueryClient from "@/lib/react-query/client";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { queryKeys } from "@/lib/react-query/keys";
import { isMediaType } from "@/lib/api/pricing";
import type { PricingCatalogData } from "@/openapi";
import { buildChatRequestBody, buildMediaRequestBody } from "./chat-transport";
import { resolveModelTargetFromStore } from "./resolve-model-target";

type SendOptions = Parameters<ChatTransport<ChatUIMessage>["sendMessages"]>[0];

// toUIMessageStream flattens the stream error to a STRING, so the detail ships as a
// JSON envelope the card parses back.
function streamErrorText(error: unknown): string {
  const detail = extractErrorDetail(error);
  return JSON.stringify({
    __unoStreamError: true,
    message: detail.message,
    status: detail.status ?? null,
    code: detail.code ?? null,
    requestId: detail.requestId ?? null,
  });
}

// Reasoning then streams with NO opening tag, so the extractor must start in
// reasoning mode or the chain of thought lands in the visible reply.
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

// The catalog decides media versus text. An empty cache used to mean "text",
// which sent an image model down chat completions.
async function isMediaModel(model: string): Promise<boolean> {
  const client = getQueryClient();
  const data: PricingCatalogData | undefined =
    client.getQueryData<PricingCatalogData>(queryKeys.pricingCatalog()) ??
    (await client
      .ensureQueryData({
        queryKey: queryKeys.pricingCatalog(),
        queryFn: async () =>
          handleElysia(await rpc.api.models.pricing.catalog.get()),
      })
      .catch(() => undefined));
  return isMediaType(data?.models?.find((m) => m.model_name === model)?.type);
}

async function mergeDbHistory(
  convId: string | null,
  captured: ChatUIMessage[],
): Promise<ChatUIMessage[]> {
  if (!convId) return captured;
  const chatData = await import("@/lib/db/client/data/chat/chat");
  const db = await chatData.readConvHistoryForSend(convId);
  const branch = db.branch as unknown as ChatUIMessage[];
  logChatDebug("send.history_source", {
    convId,
    dbBranch: branch.length,
    dbTotal: db.allIds.size,
    captured: captured.length,
    walkTruncated: db.activeCount > branch.length + 1,
  });
  if (branch.length === 0) return captured;
  const capturedIds = new Set(captured.map((m) => m.id));
  let trimEnd = branch.length;
  while (trimEnd > 0 && !capturedIds.has(branch[trimEnd - 1].id)) trimEnd--;
  // No shared id while the screen shows persisted rows means the branch flags are
  // corrupt (a mass-deactivated root): trust the render.
  if (trimEnd === 0 && captured.some((m) => db.allIds.has(m.id))) {
    logChatDebug("send.history_walk_mismatch", { convId });
    return captured;
  }
  const base = trimEnd === 0 ? branch : branch.slice(0, trimEnd);
  const baseIds = new Set(base.map((m) => m.id));
  // Only the tail BEYOND the deepest persisted match may join: an earlier unmatched
  // captured message is a stale sibling from a branch the DB no longer holds active.
  let lastMatch = -1;
  for (let i = captured.length - 1; i >= 0; i--) {
    if (baseIds.has(captured[i].id)) {
      lastMatch = i;
      break;
    }
  }
  const suffix = captured
    .slice(lastMatch + 1)
    .filter((m) => !baseIds.has(m.id));
  return [...base, ...suffix];
}

async function runClientStream(args: {
  apiKey: string;
  baseURL: string;
  model: string;
  deps: AssemblerDeps;
  options: SendOptions;
  getConvId: () => string | null;
  tokenizer?: TokenizerRef;
  extraHeaders?: Record<string, string>;
}): Promise<ReadableStream<UIMessageChunk>> {
  const history = await mergeDbHistory(args.getConvId(), args.options.messages);
  const fields = await buildChatRequestBody(args.getConvId);
  const body = {
    ...fields,
    model: args.model,
    messages: history,
    ...(args.tokenizer ? { tokenizer: args.tokenizer } : {}),
  };
  const prepared: PreparedChatRequest = await prepareChatRequest(
    args.apiKey,
    body,
    authUserId(),
    args.deps,
    args.options.abortSignal,
  );

  const group = chatStore.get(chatGroupAtom);
  const pinnedModels = group
    ? null
    : Object.keys(chatStore.get(groupByModelAtom));

  const wireOptions = prepared.providerOptions[CHAT_PROVIDER_NAME] ?? {};
  logChatDebug("request.shape", {
    model: args.model,
    selectedModel: chatStore.get(chatModelAtom) ?? null,
    group: group ?? null,
    pinnedModels,
    xGroupSent: group && group !== "auto" ? group : null,
    prefill: prefillOpensThink(prepared.messagesForUpstream),
    systemChars: prepared.effectiveSystem?.length ?? 0,
    messages: prepared.messagesForUpstream.map((m) => ({
      role: m.role,
      chars: (m.parts ?? []).reduce(
        (n, p) =>
          n + ("text" in p && typeof p.text === "string" ? p.text.length : 0),
        0,
      ),
    })),
    modelParams: prepared.modelParams,
    options: Object.fromEntries(
      Object.entries(wireOptions).map(([k, v]) => [
        k,
        typeof v === "number" ||
        typeof v === "boolean" ||
        k === "reasoningEffort" ||
        k === "provider"
          ? v
          : typeof v === "string"
            ? `str(${v.length})`
            : Array.isArray(v)
              ? `arr(${v.length})`
              : `obj(${Object.keys(v ?? {}).length})`,
      ]),
    ),
  });

  stashOutgoingRequest({
    ts: Date.now(),
    model: args.model,
    group: group ?? null,
    url: args.baseURL,
    system: prepared.effectiveSystem
      ? fingerprintText(prepared.effectiveSystem)
      : null,
    messages: prepared.messagesForUpstream.map((m) => ({
      role: m.role,
      ...fingerprintText(
        (m.parts ?? [])
          .filter((p) => "text" in p && typeof p.text === "string")
          .map((p) => ("text" in p ? p.text : ""))
          .join("\n"),
      ),
    })),
    modelParams: prepared.modelParams,
  });

  const collector = createMetaCollector();
  const startedAt = Date.now();
  const buildUsage = makeBuildUsage(prepared, startedAt, Date.now);
  let sawText = false;
  // Counted so a failure can report how far the stream got: an upstream that
  // returned nothing and one truncated mid-reply raise the same error, and
  // only this number tells them apart.
  let streamedChars = 0;
  let streamedReasoning = 0;
  const finishMeta = (
    totalUsage: { inputTokens?: number; outputTokens?: number } | undefined,
    finishReason?: string,
  ) =>
    buildFinishMeta({
      prepared,
      collector,
      buildUsage,
      totalUsage,
      speakingCharacterId: body.speakingCharacterId,
      finishReason,
      hasText: sawText,
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

  // The sdk builds the wire body itself, so the billing-group pin cannot ride a
  // body field and ships as X-Group.
  const sdk = createOpenAICompatible({
    name: CHAT_PROVIDER_NAME,
    baseURL: args.baseURL,
    apiKey: args.apiKey,
    ...((group && group !== "auto") || args.extraHeaders
      ? {
          headers: {
            ...(group && group !== "auto" ? { "X-Group": group } : {}),
            ...args.extraHeaders,
          },
        }
      : {}),
    ...(hasBodyMutation(prepared.bodyMutations)
      ? { fetch: makeBodyMutationFetch(prepared.bodyMutations) }
      : {}),
  });

  const result = streamText({
    model: wrapLanguageModel({
      model: sdk.chatModel(args.model),
      // Last entry wraps the model FIRST: coalescing runs on the raw provider
      // stream, prefillThinkMiddleware on its output, the tag extractor last.
      middleware: [
        extractReasoningMiddleware({ tagName: "think" }),
        ...(prefillOpensThink(prepared.messagesForUpstream)
          ? [prefillThinkMiddleware()]
          : []),
        coalesceReasoningMiddleware(),
      ],
    }),
    messages: await convertToModelMessages(prepared.messagesForUpstream),
    system: prepared.effectiveSystem,
    maxRetries: 0,
    // Streaming errors arrive OFF the send-promise: useChat's onError never sees
    // them, so this is the only place the real cause can be captured.
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
      // analytics does not reach the diagnostics export, and a cut-off is
      // reported by the user rather than caught here, so the counts have to be
      // in the log they send back.
      logChatDebug("stream.failed", {
        model: args.model,
        group: group ?? null,
        requestId: collector.requestId,
        status: detail.status ?? null,
        code: detail.code ?? null,
        emptyStream: isEmptyStream,
        streamedChars,
        streamedReasoning,
        elapsedMs: Date.now() - startedAt,
        message: detail.message.slice(0, 300),
      });
    },
    ...prepared.modelParams,
    providerOptions: prepared.providerOptions,
    ...(args.options.abortSignal
      ? { abortSignal: args.options.abortSignal }
      : {}),
  });

  // ai-sdk rejects these terminal promises with AI_NoOutputGeneratedError on a
  // zero-content close; unawaited they land as UNHANDLED rejections.
  void Promise.resolve(result.text).catch(() => {});
  void Promise.resolve(result.finishReason).catch(() => {});

  const responseMessageId = uid();
  const uiStream = toUIMessageStream({
    stream: result.stream,
    generateMessageId: () => responseMessageId,
    onError: (error) => streamErrorText(error),
    messageMetadata: ({ part }) => {
      if (part.type === "text-delta" && part.text) {
        sawText = true;
        streamedChars += part.text.length;
      }
      if (part.type === "reasoning-delta" && part.text)
        streamedReasoning += part.text.length;
      if (part.type === "finish-step") {
        collector.captureHeaders(part.response.headers);
        return undefined;
      }
      if (part.type === "finish") {
        // A reply that ends because the model hit its cap raises NO error, so
        // "it just cut off" reaches us with nothing recorded anywhere. Log the
        // reason and the size whenever the stop was not a natural one.
        if (part.finishReason && part.finishReason !== "stop") {
          logChatDebug("stream.truncated", {
            model: args.model,
            group: group ?? null,
            requestId: collector.requestId,
            finishReason: part.finishReason,
            streamedChars,
            streamedReasoning,
            maxOutputTokens: prepared.modelParams.maxOutputTokens ?? null,
            outputTokens: part.totalUsage?.outputTokens ?? null,
            elapsedMs: Date.now() - startedAt,
          });
        }
        const meta = finishMeta(part.totalUsage, part.finishReason);
        return Object.keys(meta).length > 0 ? meta : undefined;
      }
      return undefined;
    },
  });

  // ALWAYS wrap, even with no start alerts: the raw stream leaks the zero-content
  // AI_NoOutputGeneratedError as an unhandled rejection (vercel/ai#6879).
  return createUIMessageStream({
    onError: (error) => streamErrorText(error),
    execute: ({ writer }) => {
      for (const a of prepared.startAlerts) {
        writer.write({ type: "data-alert", data: a, transient: true });
      }
      writer.merge(uiStream);
    },
  });
}

export function makeRoutingTransport(
  getConvId: () => string | null,
): ChatTransport<ChatUIMessage> {
  const mediaTransport = new DefaultChatTransport<ChatUIMessage>({
    api: "/api/ai/chat/stream",
    body: () => buildMediaRequestBody(getConvId),
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
      ...(target.extraHeaders ? { extraHeaders: target.extraHeaders } : {}),
    });
  };

  return {
    sendMessages: async (options) => {
      const modelId = chatStore.get(chatModelAtom) ?? "";
      if (await isMediaModel(modelId))
        return mediaTransport.sendMessages(options);
      return sendText(modelId, options);
    },
    reconnectToStream: async () => null,
  };
}
