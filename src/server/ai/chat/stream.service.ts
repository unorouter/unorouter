import { getPricingSummary, isMediaModel } from "@/lib/api/pricing-cache";
import {
  CONTEXT_SAFETY_MARGIN,
  FREE_MODEL_OUTPUT_CAP,
  GUEST_USER_ID,
  UNKNOWN_MODEL_OUTPUT_CAP,
} from "@/lib/config/constants";
import { captureServerEvent } from "@/lib/posthog-server";
import { errMessage, parseStringMap } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { ChatContext, StreamOverrides } from "@/lib/validation/chat";
import { getProvider } from "@/server/constants";
import { parseRegexScripts } from "@/lib/ai/chat/regex-scripts";
import { runStartTriggers } from "./augmentation/run-triggers";
import { buildMemoryContext } from "./augmentation/memory.service";
import {
  convertToModelMessages,
  extractReasoningMiddleware,
  streamText,
  wrapLanguageModel,
} from "ai";

import {
  assembleForStream,
  assembleFromOverrides,
} from "./augmentation/prompt-assembler.service";
import { resolveChatRange } from "./augmentation/prompt-template";
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
  handleAudioStream,
  handleBufferedStream,
  handleEmbeddingStream,
  handleImageStream,
  handleVideoTaskStream,
} from "./stream/media-stream";
import {
  applyRegexScripts,
  appendPrefill,
  appendUserStub,
  collectHistory,
  collectRecentUserTexts,
  dropEmptyMessages,
  dropSummarizedPrefix,
  estimateTokens,
  expandMessageMacros,
  extractLastUserText,
  fitToTokenBudget,
  GEMINI_SAFETY_OFF,
  inlinePdfText,
  mergeAlternateRoles,
  prependUserStub,
  mkMsg,
  spliceDepthInjections,
  stripReasoningParts,
  stripSystemRole,
  type StreamMessages,
} from "./stream/transforms";
import { getModelRoleFlags } from "./model-flags";

type StreamBody = {
  model: string;
  messages: StreamMessages;
  convId?: string | null;
  webSearch?: boolean;
  overrides?: StreamOverrides;
  chatContext?: ChatContext;
  speakingCharacterId?: string | null;
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

  // IDB-first: client chatContext avoids Turso RP reads; fall back to Turso for guests/legacy.
  const convCtx = body.chatContext
    ? buildContextFromClient(body.chatContext)
    : body.convId
      ? await loadConvContext(body.convId)
      : null;
  // Toolbar toggle OR'd with conv default; web search paid-only so guests off.
  const effectiveWebSearch =
    userId !== GUEST_USER_ID &&
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

  const pdfInlined = await inlinePdfText(body.messages);
  const modelInfo = (await getPricingSummary()).models.find(
    (m) => m.name === body.model,
  );
  // Estimated USD cost from catalog prices (per 1M tokens, cheapest enabled
  // group). Free models price at 0. Estimate only: actual billing happens
  // upstream, but the chat UI needs a number to show per message + per conv.
  const estimateCost = (inputTokens: number, outputTokens: number): number =>
    modelInfo && !modelInfo.isFree
      ? (inputTokens * modelInfo.inputPrice +
          outputTokens * modelInfo.outputPrice) /
        1_000_000
      : 0;
  // Inject Anthropic cache_control markers only for Claude models that advertise
  // cache support. supportsCache alone is not enough: other providers (Mistral)
  // advertise caching but their APIs 422 on the Anthropic block format.
  const provider = getProvider(apiKey, {
    injectCacheControl:
      modelInfo?.metadata.supportsCache === true && /claude/i.test(body.model),
  });

  // Regex scripts (editprocess/editinput) from the primary character run on the
  // message text before assembly. editoutput/editdisplay run client-side.
  const primaryChar = convCtx?.boundCharacters[0]?.character as
    | { regexScripts?: unknown }
    | undefined;
  const regexScripts = parseRegexScripts(primaryChar?.regexScripts);
  const messagesWithPdfText =
    regexScripts.length > 0
      ? applyRegexScripts(pdfInlined, regexScripts)
      : pdfInlined;

  const recentUserTexts = collectRecentUserTexts(messagesWithPdfText);
  const history = collectHistory(messagesWithPdfText);
  // Per-user global vars ride the client context (client owns per-user state).
  const globalVarsIn = body.chatContext?.globalVars ?? null;

  // `start`-mode trigger scripts run before assembly. They mutate the seed var
  // store (persisted via the var-writeback channel) and can inject a system
  // prompt, folded into the assembly system block below.
  const triggerVars: Record<string, string> = convCtx
    ? parseStringMap(convCtx.settings.vars)
    : {};
  const triggerGlobalVars = parseStringMap(globalVarsIn);
  const startTrig = convCtx
    ? runStartTriggers(convCtx, triggerVars, triggerGlobalVars, history)
    : { extraSystemPrompt: "", stopSending: false };

  // Memory features (opt-in per conversation): rolling summary + semantic
  // retrieval, both best-effort (see memory.service).
  const memorySettings = convCtx?.settings as
    | {
        memoryEnabled?: boolean | null;
        summaryMemory?: string | null;
        summaryAnchor?: number | null;
      }
    | undefined;
  const memory = await buildMemoryContext(
    apiKey,
    memorySettings,
    history,
    extractLastUserText(messagesWithPdfText),
    (convCtx?.lbEntries ?? [])
      .filter((e) => e.content)
      .map((e) => ({ id: e.id, text: e.content })),
  );
  const assemblySystem =
    [
      memory.memoryBlock,
      memory.retrievalBlock,
      searchSystemMessage,
      startTrig.extraSystemPrompt,
    ]
      .filter(Boolean)
      .join("\n\n") || undefined;

  const assembled =
    body.convId && convCtx
      ? await assembleForStream(
          body.convId,
          recentUserTexts,
          assemblySystem,
          convCtx,
          {
            globalVars: globalVarsIn,
            history,
            seedVars: triggerVars,
            model: body.model,
            maxContext: modelInfo?.metadata.contextWindow,
            speakingCharacterId: body.speakingCharacterId ?? undefined,
          },
        )
      : assembleFromOverrides(body.overrides, assemblySystem);

  // Messages already folded into the rolling summary are CUT from the prompt
  // (the [Story so far] block replaces them, Risu supaMemory semantics);
  // keeping them would duplicate content the summary already carries.
  const summaryAnchor = memory.memoryBlock
    ? (memory.summaryWriteback?.anchor ?? memorySettings?.summaryAnchor ?? 0)
    : 0;
  const unsummarized =
    summaryAnchor > 0
      ? dropSummarizedPrefix(messagesWithPdfText, summaryAnchor)
      : messagesWithPdfText;

  // chatMemory is a user-set message COUNT cap; apply it first if set.
  const countSliced =
    assembled.chatMemory > 0
      ? unsummarized.slice(-assembled.chatMemory)
      : unsummarized;
  const presetMaxOut = assembled.sampling.maxOutputTokens;
  const modelMaxOut = modelInfo?.metadata.maxOutputTokens;
  // The model's own maxOutputTokens is a HARD ceiling: some models reject any
  // request above their cap (e.g. "max tokens must be <= 4096, received 8192").
  // Clamp the requested value to it (and to the free cap for free models) so a
  // preset/default asking for more never overshoots the model's real limit.
  // When the model omits its cap, fall back to UNKNOWN_MODEL_OUTPUT_CAP rather
  // than the higher free cap, since the real limit is often 4096.
  const knownCeiling = modelMaxOut ?? UNKNOWN_MODEL_OUTPUT_CAP;
  const ceilings = [
    presetMaxOut ?? knownCeiling,
    knownCeiling,
    ...(modelInfo?.isFree ? [FREE_MODEL_OUTPUT_CAP] : []),
  ];
  const effectiveMaxOutputTokens = Math.min(...ceilings);

  // Then fit to the model's real context window so a long RP can't overflow
  // (RisuAI token-budget truncation; drop oldest first). Reserve = the full
  // assembled non-history prompt (two-pass count: system + pre/post-chat parts
  // + depth/author injections) + the REQUESTED output budget + a safety margin.
  // Output reserve uses the clamped effective cap (the raw model max on
  // big-output models could eat the whole window and collapse history to one
  // message) and is additionally capped at half the context window.
  const contextWindow = modelInfo?.metadata.contextWindow;
  const outputReserve = contextWindow
    ? Math.min(effectiveMaxOutputTokens, Math.floor(contextWindow / 2))
    : effectiveMaxOutputTokens;
  const reserveTokens =
    (assembled.promptTokens || estimateTokens(assembled.system)) +
    outputReserve +
    CONTEXT_SAFETY_MARGIN;
  const slicedMessages = fitToTokenBudget(
    countSliced,
    contextWindow,
    reserveTokens,
  );

  const depthInjections = [
    ...assembled.atDepthEntries,
    ...(assembled.authorNote ? [assembled.authorNote] : []),
  ];
  const splicedMessages =
    depthInjections.length > 0
      ? spliceDepthInjections(slicedMessages, depthInjections)
      : slicedMessages;
  const historyMessages = expandMessageMacros(splicedMessages, assembled.vars);

  // Interleave the prompt template parts with chat history. The `chatHistory`
  // marker is replaced by the (sliced/depth-injected/macro-expanded) messages;
  // template message-parts before/after it become role messages. The leading
  // run of system parts is hoisted into the top-level `system` param (provider
  // preference, and what keeps the default-template path identical to before).
  // Role transforms apply automatically per model (RisuAI per-model LLMFlags
  // parity): the model's needs are OR'd with the preset's manual flags, so a
  // user never has to hand-toggle GLM/Gemini/Claude requirements but can always
  // FORCE a transform on. A manual flag is never silently turned off.
  // Computed BEFORE the system-hoist so the hoist can be conditional on it.
  const autoFlags = getModelRoleFlags(body.model);
  const noSystemRole = assembled.flags.noSystemRole || !autoFlags.fullSystem;
  const forceAlternateRoles =
    assembled.flags.forceAlternateRoles || autoFlags.alternateRoles;
  const mustStartWithUserInput =
    assembled.flags.mustStartWithUserInput || autoFlags.userStub;
  // GLM-family rejects a request ending on assistant. A prefill is an
  // intentional trailing assistant turn, so the end-stub is suppressed when one
  // is present (the prefill stays last). Auto-only: no manual preset toggle.
  const mustEndWithUserInput = autoFlags.endUserStub && !assembled.prefill;

  let processedMessages: typeof historyMessages = [];
  {
    const parts = assembled.promptParts;
    // Hoist the leading run of system messages into the top-level `system`
    // param ONLY when the model takes a real system role. Under noSystemRole
    // (GLM/DeepSeek/Kimi), hoisting would route the leading system (mainPrompt +
    // before_char lorebook char data + persona + description) into a `system:`
    // param the model ignores -> char data silently lost. Keeping lead=0 leaves
    // those parts in the array so stripSystemRole + mergeAlternateRoles fold
    // them into the leading user blob (RisuAI reformater parity).
    let lead = 0;
    if (!noSystemRole) {
      while (
        lead < parts.length &&
        parts[lead].kind === "message" &&
        (parts[lead] as { role: string }).role === "system"
      ) {
        lead++;
      }
    }
    // Walk every template part in order. Each chatHistory marker splices its
    // OWN slice of the history (RisuAI multiple-chat-card templates: e.g. old
    // history before lore, the recent tail after). hadChat guards templates
    // with no chat card: history is appended at the end so it is never lost.
    let hadChat = false;
    for (let i = lead; i < parts.length; i++) {
      const p = parts[i];
      if (p.kind === "message") {
        processedMessages.push(mkMsg(p.role, p.text));
        continue;
      }
      hadChat = true;
      const range = resolveChatRange(
        p.rangeStart,
        p.rangeEnd,
        historyMessages.length,
      );
      processedMessages.push(...historyMessages.slice(range.start, range.end));
    }
    if (!hadChat) processedMessages.push(...historyMessages);
  }
  // When we did NOT hoist (noSystemRole), the leading system content now lives
  // in the messages array (and will be stripped into the user blob), so the
  // top-level `system` param must be empty to avoid duplicating it.
  const effectiveSystem = noSystemRole ? undefined : assembled.system;

  // ORDER LOCKED, do not reshuffle:
  //  1. noSystemRole BEFORE merge: stripped system-as-user must be eligible
  //     to collapse with an adjacent user during merge.
  //  2. postHistory AFTER history, BEFORE prefill: directives read last, but
  //     prefill must remain the true trailing assistant turn.
  //  3. prefill BEFORE merge: prefill is assistant role; if user ended on
  //     assistant, mergeAlternateRoles collapses the two into one (Risu parity).
  //  4. mergeAlternateRoles AFTER prefill: output strictly
  //     user/assistant/user/assistant.
  //  5. prependUserStub after merge so merge cannot fold the stub into a
  //     following user message.
  //  6. appendUserStub LAST (GLM "last role must be user"): if the conv ends on
  //     assistant and no prefill made that intentional, close with a user stub.
  //     Runs after merge so it can't be merged away; skipped when a prefill is
  //     the deliberate trailing assistant turn.
  // Strip output-only reasoning from history FIRST: an assistant turn's
  // reasoning_content must never be echoed back as input (GLM rejects it).
  // Runs before role transforms + the empty-drop so a reasoning-only turn
  // collapses cleanly.
  processedMessages = stripReasoningParts(processedMessages);
  if (noSystemRole) {
    processedMessages = stripSystemRole(processedMessages);
  }
  // Drop fully-empty messages BEFORE merge (RisuAI parity: pushPrompts skips
  // empties + openAI/requests.ts filters `content.trim() !== '' || multimodals`).
  // CRITICAL ordering: dropping an empty message AFTER mergeAlternateRoles can
  // re-create two consecutive same-role messages (e.g. user, empty-assistant,
  // user -> drop -> user, user), which GLM/strict-alternation upstreams REJECT
  // (the stream then errors with no finish frame -> no request log). Filtering
  // first lets merge collapse the now-adjacent same-role turns cleanly.
  processedMessages = dropEmptyMessages(processedMessages);
  // (Post-history is now part of the template walk: parts after the chatHistory
  // marker were already appended above, so no separate append here.)
  // Prefill always lands (RisuAI parity): a trailing assistant prefill is a
  // powerful jailbreak surface and must never be dropped. When the conversation
  // already ends with an assistant turn, mergeAlternateRoles (below) folds the
  // two assistant messages into one, preserving order.
  if (assembled.prefill) {
    processedMessages = appendPrefill(processedMessages, assembled.prefill);
  }
  if (forceAlternateRoles) {
    processedMessages = mergeAlternateRoles(processedMessages);
  }
  if (mustStartWithUserInput) {
    processedMessages = prependUserStub(processedMessages);
  }
  if (mustEndWithUserInput) {
    processedMessages = appendUserStub(processedMessages);
  }
  const messagesForUpstream = processedMessages;

  // Chat-variable writeback: macro expansion (setvar/addvar in the system prompt
  // + message bodies) mutated assembled.vars.vars in place. If it now differs
  // from the conversation's stored vars, ride the new map back on the finish
  // metadata so the client persists it to conversationSettings.vars (RisuAI
  // persists chat vars each turn; the server is read-only on conv state, so the
  // client owns the write). Serialized once; null when unchanged.
  const varsChanged =
    JSON.stringify(assembled.vars.vars) !==
    (convCtx?.settings.vars ?? JSON.stringify({}));
  const varsWriteback = varsChanged
    ? JSON.stringify(assembled.vars.vars)
    : null;
  // Per-user global vars writeback (setglobalvar). Compared against the client's
  // input map; client persists to its per-user global store on change.
  const globalVarsOut = JSON.stringify(assembled.vars.globalVars ?? {});
  const globalVarsWriteback =
    globalVarsOut !== (globalVarsIn ?? JSON.stringify({}))
      ? globalVarsOut
      : null;

  // Persisted as request-log row for upstream debugging (RisuAI Logs analog).
  const debugRequestSnapshot = {
    requestBody: {
      model: body.model,
      messages: body.messages,
      chatContext: body.chatContext,
      overrides: body.overrides,
      webSearch: body.webSearch,
      convId: body.convId,
    },
    // Mirror what actually goes upstream: null for noSystemRole models (the
    // system content was folded into the user blob instead of a system param).
    assembledSystem: effectiveSystem ?? null,
    finalMessages: messagesForUpstream,
  };

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
          const u = buildUsage(total?.inputTokens ?? 0, total?.outputTokens ?? 0);
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
