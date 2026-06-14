    // Stage 5: derive streamText params, provider options, and per-model wire mutations, plus var writebacks and the request-log snapshot.

import type { ProcessedModel } from "@/lib/api/pricing";
import type { AssembledSystem } from "../../prompt/assembler.service";
import { GEMINI_SAFETY_OFF, type StreamMessages } from "../transforms";
import type { getModelRoleFlags } from "../role-flags";
import type { StreamBody } from "../prepare.service";

type AutoFlags = ReturnType<typeof getModelRoleFlags>;

// Strip undefined keys so absent != explicit-undefined.
function defined<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

export function buildModelParams(
  assembled: AssembledSystem,
  effectiveMaxOutputTokens: number,
) {
  return defined({
    maxOutputTokens: effectiveMaxOutputTokens || undefined,
    temperature: assembled.sampling.temperature,
    topP: assembled.sampling.topP,
    topK: assembled.sampling.topK,
    frequencyPenalty: assembled.sampling.frequencyPenalty,
    presencePenalty: assembled.sampling.presencePenalty,
  });
}

export function buildProviderOptions(
  assembled: AssembledSystem,
  autoFlags: AutoFlags,
  modelInfo: ProcessedModel | undefined,
) {
      // extraBody is free-form user JSON; a max_tokens key would override the clamped free cap, so strip token-limit keys for free models.
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
  return {
    openai: {
      ...(safeExtraBody ?? {}),
      ...defined({
        min_p: assembled.sampling.minP,
        top_a: assembled.sampling.topA,
        repetition_penalty: assembled.sampling.repetitionPenalty,
        reasoning_effort: assembled.reasoningEffort,
            // Gemini-only: threshold=OFF (stronger than BLOCK_NONE), no-op elsewhere. Thinking-exp variants exclude CIVIC_INTEGRITY.
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
}

    // Per-model wire-body rewrites (Risu LLMFlags mutations). deepseek accepts low/medium/high; claude adaptive only fires on high/xhigh.
export function buildBodyMutations(
  assembled: AssembledSystem,
  autoFlags: AutoFlags,
  modelInfo: ProcessedModel | undefined,
  deepSeekReasoningContent: string | undefined,
) {
  const effort = assembled.reasoningEffort;
  return {
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
}

    // Chat-var writeback rides finish metadata; the server is read-only on conv state, the client persists. Null when unchanged.
export function buildWritebacks(
  assembled: AssembledSystem,
  storedVars: string | null | undefined,
  globalVarsIn: string | null,
) {
  const emptyObj = JSON.stringify({});
  const varsOut = JSON.stringify(assembled.vars.vars);
  const varsWriteback = varsOut !== (storedVars ?? emptyObj) ? varsOut : null;
  const globalVarsOut = JSON.stringify(assembled.vars.globalVars ?? {});
  const globalVarsWriteback =
    globalVarsOut !== (globalVarsIn ?? emptyObj) ? globalVarsOut : null;
  return { varsWriteback, globalVarsWriteback };
}

    // Request-log row (RisuAI Logs analog). Raw client messages not echoed; finalMessages is the post-assembly truth.
export function buildDebugSnapshot(
  body: StreamBody,
  effectiveSystem: string | undefined,
  messagesForUpstream: StreamMessages,
) {
  return {
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
}

// UI cost estimate from catalog prices; real billing happens upstream.
export function makeCostEstimator(modelInfo: ProcessedModel | undefined) {
  return (inputTokens: number, outputTokens: number): number =>
    modelInfo && !modelInfo.isFree
      ? (inputTokens * modelInfo.inputPrice +
          outputTokens * modelInfo.outputPrice) /
        1_000_000
      : 0;
}
