// Text-stream request assembly (chat body -> streamText args); stream.service.ts
// keeps orchestration, telemetry, and the streamText call.

import { getPricingSummary } from "@/lib/api/pricing-cache";
import {
  CONTEXT_SAFETY_MARGIN,
  FREE_MODEL_OUTPUT_CAP,
  GUEST_USER_ID,
  UNKNOWN_MODEL_OUTPUT_CAP,
} from "@/lib/config/constants";
import { captureServerEvent } from "@/lib/posthog-server";
import { parseStringMap } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { ChatContext, StreamOverrides } from "@/lib/validation/chat";
import { parseRegexScripts } from "@/lib/ai/chat/regex-scripts";
import { risuUnescape } from "@/lib/ai/chat/macros";
import {
  extractLuaCodes,
  runLuaEditTrigger,
} from "@/lib/ai/chat/triggers/lua/engine";
import {
  makeTriggerContext,
  parseTriggerScripts,
} from "@/lib/ai/chat/triggers/vm";
import { runStartTriggers } from "../augmentation/run-triggers";
import type { InlayImage } from "../augmentation/inlay.service";
import { makeServerTriggerOps } from "../augmentation/trigger-ops";
import { buildMemoryContext } from "../augmentation/memory.service";
import {
  assembleForStream,
  assembleFromOverrides,
} from "../augmentation/prompt-assembler.service";
import { resolveChatRange } from "../augmentation/prompt-template";
import {
  buildContextFromClient,
  loadConvContext,
} from "../augmentation/prompt-assembler/conv-context";
import { resolveContextPayload } from "./context-cache";
import {
  formatSearchContext,
  needsWebSearch,
  searchTavily,
} from "../augmentation/tavily.service";
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
  unescapeMessages,
  spliceDepthInjections,
  stripReasoningParts,
  stripSystemRole,
  type StreamMessages,
} from "./transforms";
import { getModelRoleFlags } from "../model-flags";

export type StreamBody = {
  model: string;
  messages: StreamMessages;
  convId?: string | null;
  webSearch?: boolean;
  // Billing/routing group sent upstream as X-Group; null/absent == "auto".
  group?: string | null;
  overrides?: StreamOverrides;
  chatContext?: ChatContext;
  chatContextHash?: string;
  globalVars?: string | null;
  speakingCharacterId?: string | null;
  messageTimes?: Record<string, number>;
  clientEnv?: {
    viewportW?: number;
    viewportH?: number;
    locale?: string;
    timeZone?: string;
  };
};

export async function prepareChatRequest(
  apiKey: string,
  body: StreamBody,
  request: Request,
  userId: number,
) {
  // IDB-first: client context (or cached hash, 409 on stale) beats Turso reads;
  // Turso is the guest/legacy fallback.
  const clientCtx = resolveContextPayload(body);
  const convCtx = clientCtx
    ? buildContextFromClient(clientCtx)
    : body.convId
      ? await loadConvContext(userId, body.convId)
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
  const modelInfo = (await getPricingSummary()).byName.get(body.model);
  // UI cost estimate from catalog prices; real billing happens upstream.
  const estimateCost = (inputTokens: number, outputTokens: number): number =>
    modelInfo && !modelInfo.isFree
      ? (inputTokens * modelInfo.inputPrice +
          outputTokens * modelInfo.outputPrice) /
        1_000_000
      : 0;
  // Primary character's editprocess/editinput scripts run server-side pre-assembly;
  // editoutput/editdisplay run client-side.
  const primaryChar = convCtx?.boundCharacters[0]?.character as
    | { regexScripts?: unknown }
    | undefined;
  const regexScripts = parseRegexScripts(primaryChar?.regexScripts);
  const messagesWithPdfText =
    regexScripts.length > 0
      ? applyRegexScripts(pdfInlined, regexScripts)
      : pdfInlined;

  // Lua listenEdit('editInput') on the last user message (Risu edit pipeline).
  let messagesAfterLua = messagesWithPdfText;
  const triggerScriptsRaw = parseTriggerScripts(
    (primaryChar as { triggers?: unknown } | undefined)?.triggers,
  );
  const luaCodes = extractLuaCodes(triggerScriptsRaw);
  if (luaCodes.length > 0) {
    const editCtx = makeTriggerContext({
      mode: "input",
      vars: {},
      globalVars: {},
      chat: [],
    });
    const lastUserIdx = (() => {
      for (let i = messagesAfterLua.length - 1; i >= 0; i--) {
        if (messagesAfterLua[i].role === "user") return i;
      }
      return -1;
    })();
    if (lastUserIdx !== -1) {
      const m = messagesAfterLua[lastUserIdx];
      if (Array.isArray(m.parts)) {
        const parts = await Promise.all(
          m.parts.map(async (p) =>
            p.type === "text" && typeof p.text === "string"
              ? {
                  ...p,
                  text: await runLuaEditTrigger(
                    luaCodes,
                    "editinput",
                    editCtx,
                    p.text,
                  ),
                }
              : p,
          ),
        );
        messagesAfterLua = messagesAfterLua.map((mm, i) =>
          i === lastUserIdx
            ? ({ ...mm, parts } as (typeof messagesAfterLua)[number])
            : mm,
        );
      }
    }
  }

  const recentUserTexts = collectRecentUserTexts(messagesAfterLua);
  const history = collectHistory(messagesAfterLua, body.messageTimes);
  // Global vars ride outside the hashed context; hashing them would bust the cache every setglobalvar turn.
  const globalVarsIn = body.globalVars ?? clientCtx?.globalVars ?? null;

  // `start` triggers mutate seed vars (persisted via writeback) and may inject a system prompt.
  const triggerVars: Record<string, string> = convCtx
    ? parseStringMap(convCtx.settings.vars)
    : {};
  const triggerGlobalVars = parseStringMap(globalVarsIn);
  const inlayMedia: InlayImage[] = [];
  const startTrig = convCtx
    ? await runStartTriggers(
        convCtx,
        triggerVars,
        triggerGlobalVars,
        history,
        makeServerTriggerOps(apiKey, body.model, inlayMedia),
      )
    : { extraSystemPrompt: "", stopSending: false, alerts: [] };

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
    extractLastUserText(messagesAfterLua),
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
            clientEnv: body.clientEnv,
            prefillSupported: getModelRoleFlags(body.model).prefillSupported,
          },
        )
      : assembleFromOverrides(body.overrides, assemblySystem);

  // Summarized messages are cut; the [Story so far] block replaces them (Risu supaMemory).
  const summaryAnchor = memory.memoryBlock
    ? (memory.summaryWriteback?.anchor ?? memorySettings?.summaryAnchor ?? 0)
    : 0;
  const unsummarized =
    summaryAnchor > 0
      ? dropSummarizedPrefix(messagesAfterLua, summaryAnchor)
      : messagesAfterLua;

  // chatMemory is a user-set message COUNT cap; apply it first if set.
  const countSliced =
    assembled.chatMemory > 0
      ? unsummarized.slice(-assembled.chatMemory)
      : unsummarized;
  const presetMaxOut = assembled.sampling.maxOutputTokens;
  const modelMaxOut = modelInfo?.metadata.maxOutputTokens;
  // Model maxOutputTokens is a hard ceiling (models reject overshoot); clamp preset
  // to it + free cap. Unknown cap falls back to UNKNOWN_MODEL_OUTPUT_CAP (often 4096).
  const knownCeiling = modelMaxOut ?? UNKNOWN_MODEL_OUTPUT_CAP;
  const ceilings = [
    presetMaxOut ?? knownCeiling,
    knownCeiling,
    ...(modelInfo?.isFree ? [FREE_MODEL_OUTPUT_CAP] : []),
  ];
  const effectiveMaxOutputTokens = Math.min(...ceilings);

  // Fit to context window, drop oldest first (RisuAI truncation). Reserve = assembled
  // non-history prompt + clamped output cap (raw model max could eat the window),
  // output reserve also capped at half the window.
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

  // Role transforms: model auto-flags OR'd with preset manual flags (RisuAI LLMFlags
  // parity); a manual flag is never silently turned off. Computed before the
  // system-hoist so the hoist can be conditional on it.
  const autoFlags = getModelRoleFlags(body.model);
  const noSystemRole = assembled.flags.noSystemRole || !autoFlags.fullSystem;
  const forceAlternateRoles =
    assembled.flags.forceAlternateRoles || autoFlags.alternateRoles;
  const mustStartWithUserInput =
    assembled.flags.mustStartWithUserInput || autoFlags.userStub;
  // GLM rejects requests ending on assistant; a prefill is intentional, so it suppresses the end-stub.
  const mustEndWithUserInput = autoFlags.endUserStub && !assembled.prefill;

  let processedMessages: typeof historyMessages = [];
  {
    const parts = assembled.promptParts;
    // Hoist leading system parts into the `system` param only when the model has a
    // real system role; under noSystemRole the param is ignored and char data would
    // be silently lost, so lead=0 keeps them in the array for stripSystemRole+merge.
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
    // Each chatHistory marker splices its own history slice (RisuAI multi-chat-card
    // templates); hadChat appends history at the end when no marker exists.
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
  // Unhoisted (noSystemRole): system content lives in the messages array, so the param must be empty.
  const effectiveSystem =
    noSystemRole || assembled.system == null
      ? undefined
      : risuUnescape(assembled.system);

  // ORDER LOCKED, do not reshuffle:
  //  1. stripReasoningParts first: reasoning_content echoed as input is rejected (GLM).
  //  2. noSystemRole before merge: stripped system-as-user must be merge-eligible.
  //  3. prefill before merge: trailing assistant prefill collapses with an existing one (Risu parity).
  //  4. mergeAlternateRoles after prefill: strict user/assistant alternation.
  //  5. prependUserStub after merge so merge cannot fold the stub away.
  //  6. appendUserStub last (GLM "last role must be user"); skipped when a prefill is the intentional trailing assistant.
  // DeepSeek thinking-input: echo the trailing assistant turn's reasoning back
  // as reasoning_content (collected before the strip).
  let deepSeekReasoningContent: string | undefined;
  const lastMsg = processedMessages[processedMessages.length - 1];
  if (
    autoFlags.deepSeekThinkingInput &&
    lastMsg?.role === "assistant" &&
    Array.isArray(lastMsg.parts)
  ) {
    const thoughts = lastMsg.parts
      .filter(
        (p) => p.type === "reasoning" && typeof p.text === "string" && p.text,
      )
      .map((p) => (p as { text: string }).text);
    if (thoughts.length > 0) deepSeekReasoningContent = thoughts.join("\n");
  }
  processedMessages = stripReasoningParts(processedMessages);
  if (noSystemRole) {
    processedMessages = stripSystemRole(processedMessages);
  }
  // Drop empties BEFORE merge (RisuAI parity): dropping after merge can recreate
  // consecutive same-role messages, which strict-alternation upstreams reject.
  processedMessages = dropEmptyMessages(processedMessages);
  // The default template emits prefill as a `prefill` slot (before the
  // postHistory end inject). Only fall back to appending it when a custom
  // template dropped the card, so prefill still lands (RisuAI parity); merge
  // below folds a doubled trailing assistant.
  if (assembled.prefill) {
    const emitted = assembled.promptParts.some(
      (p) =>
        p.kind === "message" &&
        p.role === "assistant" &&
        p.text === assembled.prefill,
    );
    if (!emitted) {
      processedMessages = appendPrefill(processedMessages, assembled.prefill);
    }
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
  // Lua listenEdit('editRequest') over the formated {role, content} array.
  if (luaCodes.length > 0) {
    const editCtx = makeTriggerContext({
      mode: "request",
      vars: {},
      globalVars: {},
      chat: [],
    });
    const formated = processedMessages.map((m) => ({
      role: m.role,
      content: Array.isArray(m.parts)
        ? m.parts
            .filter((p) => p.type === "text" && typeof p.text === "string")
            .map((p) => (p as { text: string }).text)
            .join("\n")
        : "",
    }));
    const edited = await runLuaEditTrigger(
      luaCodes,
      "editrequest",
      editCtx,
      formated,
    );
    if (Array.isArray(edited) && edited.length === formated.length) {
      processedMessages = processedMessages.map((m, i) =>
        edited[i] &&
        typeof edited[i].content === "string" &&
        edited[i].content !== formated[i].content
          ? ({
              ...m,
              parts: [{ type: "text", text: edited[i].content }],
            } as (typeof processedMessages)[number])
          : m,
      );
    }
  }
  // #escape protection ends here: un-map private-use chars before upstream.
  const messagesForUpstream = unescapeMessages(processedMessages);

  // Chat-var writeback rides finish metadata; server is read-only on conv state,
  // the client owns the persist. Null when unchanged.
  const varsChanged =
    JSON.stringify(assembled.vars.vars) !==
    (convCtx?.settings.vars ?? JSON.stringify({}));
  const varsWriteback = varsChanged
    ? JSON.stringify(assembled.vars.vars)
    : null;
  const globalVarsOut = JSON.stringify(assembled.vars.globalVars ?? {});
  const globalVarsWriteback =
    globalVarsOut !== (globalVarsIn ?? JSON.stringify({}))
      ? globalVarsOut
      : null;

  // Request-log row (RisuAI Logs analog). Raw client messages not echoed
  // (prompt-sized; finalMessages is the post-assembly truth).
  const debugRequestSnapshot = {
    requestBody: {
      model: body.model,
      messagesCount: body.messages.length,
      // Full-context sends only; hash hits log just the fingerprint.
      chatContext: body.chatContext,
      chatContextHash: body.chatContextHash,
      overrides: body.overrides,
      webSearch: body.webSearch,
      convId: body.convId,
    },
    // Mirrors upstream: null for noSystemRole models.
    assembledSystem: effectiveSystem ?? null,
    finalMessages: messagesForUpstream,
  };
  // Spread-only-when-set: strip undefined keys so absent != explicit-undefined.
  const defined = <T extends Record<string, unknown>>(o: T): Partial<T> =>
    Object.fromEntries(
      Object.entries(o).filter(([, v]) => v !== undefined),
    ) as Partial<T>;

  const modelParams = defined({
    maxOutputTokens: effectiveMaxOutputTokens || undefined,
    temperature: assembled.sampling.temperature,
    topP: assembled.sampling.topP,
    topK: assembled.sampling.topK,
    frequencyPenalty: assembled.sampling.frequencyPenalty,
    presencePenalty: assembled.sampling.presencePenalty,
  });

  // extraBody is free-form user JSON; on a free model a max_tokens /
  // max_completion_tokens key here would land in the provider body and
  // override the clamped FREE_MODEL_OUTPUT_CAP. Strip token-limit keys for
  // free models so the cap holds.
  const safeExtraBody =
    modelInfo?.isFree && assembled.extraBody
      ? Object.fromEntries(
          Object.entries(assembled.extraBody).filter(
            ([k]) =>
              ![
                "max_tokens",
                "max_completion_tokens",
                "maxOutputTokens",
                "max_output_tokens",
              ].includes(k),
          ),
        )
      : assembled.extraBody;

  // extraBody first: sliders/reasoning win on key collision.
  const providerOptions = {
    openai: {
      ...(safeExtraBody ?? {}),
      ...defined({
        min_p: assembled.sampling.minP,
        top_a: assembled.sampling.topA,
        repetition_penalty: assembled.sampling.repetitionPenalty,
        reasoning_effort: assembled.reasoningEffort,
        // Gemini-only: threshold=OFF (stronger than BLOCK_NONE); no-op
        // elsewhere. Thinking-exp variants reject CIVIC_INTEGRITY (Risu
        // noCivilIntegrity), so it is excluded for them.
        safetySettings: assembled.flags.geminiBlockOff
          ? autoFlags.noCivilIntegrity
            ? GEMINI_SAFETY_OFF.filter(
                (s) => s.category !== "HARM_CATEGORY_CIVIC_INTEGRITY",
              )
            : GEMINI_SAFETY_OFF
          : undefined,
        // Provider pin (OpenRouter shape); no-op on channels that don't route on it.
        provider: assembled.providerRouting,
      }),
    },
  };

  // Per-model wire-body rewrites (Risu LLMFlags request mutations). Reasoning
  // efforts map: deepseek accepts low/medium/high; claude adaptive only fires
  // on high/xhigh (lower efforts ride reasoning_effort -> upstream budget).
  const effort = assembled.reasoningEffort;
  const bodyMutations = {
    injectCacheControl:
      modelInfo?.metadata.supportsCache === true && autoFlags.cacheControl,
    deepSeekPrefix: autoFlags.deepSeekPrefix || undefined,
    deepSeekReasoningContent,
    deepSeekThinking:
      autoFlags.deepSeekThinkingToggle && effort != null
        ? {
            enabled: effort !== "none",
            effort:
              effort === "xhigh"
                ? "high"
                : effort === "minimal"
                  ? "low"
                  : effort === "none"
                    ? "high"
                    : effort,
          }
        : undefined,
    claudeAdaptive:
      autoFlags.claudeAdaptiveThinking &&
      (effort === "high" || effort === "xhigh")
        ? {
            effort:
              effort === "xhigh" && autoFlags.claudeXHighEffort
                ? ("xhigh" as const)
                : ("high" as const),
          }
        : undefined,
  };

  return {
    modelInfo,
    estimateCost,
    effectiveWebSearch,
    effectiveSystem,
    messagesForUpstream,
    modelParams,
    providerOptions,
    streamingEnabled: assembled.streamingEnabled,
    memory,
    varsWriteback,
    globalVarsWriteback,
    debugRequestSnapshot,
    bodyMutations,
    // start-trigger showAlert frames (normal/error), streamed as transient
    // data-alert parts.
    startAlerts: startTrig.alerts,
    // V1 stop effect: a start trigger requested the prompt not be sent.
    stopRequested: startTrig.stopSending,
    // runImgGen results: client persists these media rows from finish-meta.
    inlayMedia,
  };
}
