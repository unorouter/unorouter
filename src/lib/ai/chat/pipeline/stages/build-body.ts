// Stage 5: derive streamText params, provider options, per-model wire mutations, var writebacks, and the request-log snapshot.

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

// camelCase modelParams key -> upstream apiKey checked against supportedParameters.
const PARAM_API_KEY: Record<string, string> = {
  maxOutputTokens: "max_tokens",
  temperature: "temperature",
  topP: "top_p",
  topK: "top_k",
  frequencyPenalty: "frequency_penalty",
  presencePenalty: "presence_penalty",
  min_p: "min_p",
  top_a: "top_a",
  repetition_penalty: "repetition_penalty",
};

// Drop sampling keys the model's metadata says it doesn't accept, so a value stored on a
// preset/conversation for a param the UI greyed out never ships (upstream would 400). Only
// gates when supportedParameters is a known non-empty list; absent metadata sends everything.
function stripUnsupported<T extends Record<string, unknown>>(
  o: T,
  supported: string[] | undefined,
): Partial<T> {
  if (!supported || supported.length === 0) return o;
  const ok = (apiKey: string) =>
    apiKey === "max_tokens"
      ? supported.includes("max_tokens") ||
        supported.includes("max_completion_tokens")
      : supported.includes(apiKey);
  return Object.fromEntries(
    Object.entries(o).filter(([k]) => {
      const apiKey = PARAM_API_KEY[k];
      return apiKey ? ok(apiKey) : true;
    }),
  ) as Partial<T>;
}

export function buildModelParams(
  assembled: AssembledSystem,
  effectiveMaxOutputTokens: number,
  modelInfo: ProcessedModel | undefined,
) {
  return stripUnsupported(
    defined({
      maxOutputTokens: effectiveMaxOutputTokens || undefined,
      temperature: assembled.sampling.temperature,
      topP: assembled.sampling.topP,
      topK: assembled.sampling.topK,
      frequencyPenalty: assembled.sampling.frequencyPenalty,
      presencePenalty: assembled.sampling.presencePenalty,
    }),
    modelInfo?.metadata.supportedParameters,
  );
}

export function buildProviderOptions(
  assembled: AssembledSystem,
  autoFlags: AutoFlags,
  modelInfo: ProcessedModel | undefined,
) {
  // extraBody is free-form user JSON; a max_tokens key would override the clamped free cap, so strip token-limit keys for free.
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
      ...stripUnsupported(
        defined({
          min_p: assembled.sampling.minP,
          top_a: assembled.sampling.topA,
          repetition_penalty: assembled.sampling.repetitionPenalty,
        }),
        modelInfo?.metadata.supportedParameters,
      ),
      ...defined({
        reasoning_effort: assembled.reasoningEffort,
        // Gemini-only: threshold=OFF (stronger than BLOCK_NONE), no-op elsewhere. Thinking-exp drops CIVIC_INTEGRITY.
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

// Per-model wire-body rewrites (Risu LLMFlags mutations). deepseek accepts low/medium/high; claude adaptive fires on high/xhigh.
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

// Chat-var writeback rides finish metadata; the server is read-only on conv state, the client persists. Null if unchanged.
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
// chatContext is stored as a compact summary: the full dump (preset + lorebooks + characters) bloated
// request_logs rows and read as junk in the log viewer; the assembled result lives in finalMessages anyway.
export function buildDebugSnapshot(
  body: StreamBody,
  effectiveSystem: string | undefined,
  messagesForUpstream: StreamMessages,
  // Upstream target for the request-log curl: bare endpoint path + full url.
  target?: { endpoint: string; url: string },
) {
  const ctx = body.chatContext;
  return {
    requestBody: {
      model: body.model,
      messagesCount: body.messages.length,
      chatContext: ctx
        ? {
            characters: (ctx.characters ?? []).length,
            lorebooks: (ctx.lorebooks ?? []).length,
            lorebookEntries: (ctx.lorebooks ?? []).reduce(
              (n, l) => n + (l.entries?.length ?? 0),
              0,
            ),
            hasPersona: ctx.persona != null,
            hasPreset: ctx.preset != null,
          }
        : undefined,
      overrides: body.overrides,
      webSearch: body.webSearch,
      convId: body.convId,
    },
    // Mirrors upstream: null for noSystemRole models.
    assembledSystem: effectiveSystem ?? null,
    finalMessages: messagesForUpstream,
    endpoint: target?.endpoint ?? null,
    url: target?.url ?? null,
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
