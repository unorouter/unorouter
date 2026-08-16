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
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import {
  chatGroupAtom,
  chatModelAtom,
  chatStore,
  localUserIdAtom,
} from "@/store/chat-store";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { isMediaType, type ProcessedModel } from "@/lib/api/pricing";
import { buildChatRequestBody, buildMediaRequestBody } from "./chat-transport";
import { resolveModelTargetFromStore } from "./resolve-model-target";

type SendOptions = Parameters<ChatTransport<ChatUIMessage>["sendMessages"]>[0];

// The stream error surfaces to the in-thread card as a STRING (ai-sdk flattens
// it in toUIMessageStream), so serialize the FULL detail as a JSON envelope
// rather than a lone message. extractErrorDetail already digs the real upstream
// body out of APICallError.responseBody (new-api's {error:{message}} shape, or
// the raw text when the SDK's strict error zod rejected new-api's `code: any`
// and collapsed .message to "bad_response_status_code"). The card parses this
// back to show message + HTTP status + code + request id, matching the
// persisted-error card. Plain strings without the marker still render as-is.
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

// The DB is the canonical history (repo invariant); the useChat array is a render
// projection that lags it: the greeting seeds after the first send captures state,
// edits/deletes repair it asynchronously, and a heavy loadout widens every gap. The
// request therefore takes the DB's active branch as the base and appends only the
// captured messages the DB does not know yet (the just-typed user turn racing its
// own persistence). A regenerate slices the captured array to the parent while the
// DB still holds the sliced reply as active, so the DB base is TRIMMED at the
// deepest captured id: everything past it was deliberately cut by the caller.
async function mergeDbHistory(
  userId: number,
  convId: string | null,
  captured: ChatUIMessage[],
): Promise<ChatUIMessage[]> {
  if (!convId) return captured;
  const chatData = await import("@/lib/db/client/data/chat/chat");
  const db = await chatData.readConvHistoryForSend(userId, convId);
  const branch = db.branch as unknown as ChatUIMessage[];
  if (branch.length === 0) return captured;
  const capturedIds = new Set(captured.map((m) => m.id));
  let trimEnd = branch.length;
  while (trimEnd > 0 && !capturedIds.has(branch[trimEnd - 1].id)) trimEnd--;
  // The walk shares NO id with the screen, yet the screen shows persisted rows:
  // the branch flags are corrupt (a mass-deactivated root once produced exactly
  // this), so the walk cannot be trusted; the rendered history can.
  if (trimEnd === 0 && captured.some((m) => db.allIds.has(m.id))) {
    logChatDebug("send.history_walk_mismatch", { convId });
    return captured;
  }
  // Nothing persisted is on screen (fresh thread pre-append): keep the whole
  // branch as base so the seeded greeting is included.
  const base = trimEnd === 0 ? branch : branch.slice(0, trimEnd);
  const baseIds = new Set(base.map((m) => m.id));
  // Only the tail BEYOND the deepest persisted match may join: an unmatched
  // captured message earlier than that (a stale sibling mid branch-swap) belongs
  // to a branch the DB no longer considers active.
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
  const userId = chatStore.get(localUserIdAtom);
  const history = await mergeDbHistory(
    userId,
    args.getConvId(),
    args.options.messages as ChatUIMessage[],
  );
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
    userId,
    args.deps,
    args.options.abortSignal,
  );

  // The billing-group pin. Read once here and reused for the sdk header below,
  // so the debug log records EXACTLY the group that ships as X-Group. selectedModel
  // is the live dropdown model; a mismatch with args.model (the snapshotted send
  // model) or a group pinned to a different model's channel surfaces here.
  const group = chatStore.get(chatGroupAtom);

  // Wire-shape diagnostics without content: numeric/bool option values pass,
  // free-text option values reduce to their length.
  const wireOptions = prepared.providerOptions[CHAT_PROVIDER_NAME] ?? {};
  logChatDebug("request.shape", {
    model: args.model,
    selectedModel: chatStore.get(chatModelAtom) ?? null,
    group: group ?? null,
    xGroupSent: group && group !== "auto" ? group : null,
    prefill: prefillOpensThink(prepared.messagesForUpstream),
    systemChars: prepared.effectiveSystem?.length ?? 0,
    messages: prepared.messagesForUpstream.map((m) => ({
      role: (m as { role: string }).role,
      chars: ((m as { parts?: { text?: string }[] }).parts ?? []).reduce(
        (n, p) => n + (typeof p.text === "string" ? p.text.length : 0),
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

  const collector = createMetaCollector();
  const startedAt = Date.now();
  const buildUsage = makeBuildUsage(prepared, startedAt, Date.now);
  let sawText = false;
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

  // The sdk builds the wire body itself, so the billing-group pin can't ride
  // body.group like the legacy transport; carry it as X-Group instead. `group`
  // was read at the top of this function (logged in request.shape).
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
      // Array order: last wraps the model first, so prefillThinkMiddleware sees
      // the raw upstream stream and the tag extractor post-processes its output.
      middleware: [
        extractReasoningMiddleware({ tagName: "think" }),
        ...(prefillOpensThink(prepared.messagesForUpstream)
          ? [prefillThinkMiddleware()]
          : []),
      ],
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
      if (part.type === "text-delta" && part.text) sawText = true;
      if (part.type === "finish-step") {
        collector.captureHeaders(part.response.headers);
        return undefined;
      }
      if (part.type === "finish") {
        const meta = finishMeta(part.totalUsage, part.finishReason);
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
    sendMessages: (options) => {
      const modelId = chatStore.get(chatModelAtom) ?? "";
      if (isMediaModel(modelId)) return mediaTransport.sendMessages(options);
      return sendText(modelId, options);
    },
    reconnectToStream: async () => null,
  };
}
