import type { ProcessedModel } from "@/lib/api/pricing";
import type { AssembledSystem } from "../../prompt/assembler.service";
import { GEMINI_SAFETY_OFF, type StreamMessages } from "../transforms";
import type { getModelRoleFlags } from "../role-flags";
import type { StreamBody } from "../prepare.service";

type AutoFlags = ReturnType<typeof getModelRoleFlags>;

function defined<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== undefined),
  ) as Partial<T>;
}

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
        safetySettings: assembled.flags.geminiBlockOff
          ? autoFlags.noCivilIntegrity
            ? GEMINI_SAFETY_OFF.filter(
                (s) => s.category !== "HARM_CATEGORY_CIVIC_INTEGRITY",
              )
            : GEMINI_SAFETY_OFF
          : undefined,
        provider: assembled.providerRouting,
      }),
    },
  };
}

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

export function buildDebugSnapshot(
  body: StreamBody,
  effectiveSystem: string | undefined,
  messagesForUpstream: StreamMessages,
  target?: { endpoint: string; url: string },
) {
  const ctx = body.chatContext;
  const leanMessages = messagesForUpstream.map((m) => ({
    role: (m as { role: string }).role,
    parts: (m as { parts?: unknown }).parts,
  }));
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
    assembledSystem: effectiveSystem ?? null,
    finalMessages: leanMessages,
    endpoint: target?.endpoint ?? null,
    url: target?.url ?? null,
  };
}

export function makeCostEstimator(modelInfo: ProcessedModel | undefined) {
  return (inputTokens: number, outputTokens: number): number =>
    modelInfo && !modelInfo.isFree
      ? (inputTokens * modelInfo.inputPrice +
          outputTokens * modelInfo.outputPrice) /
        1_000_000
      : 0;
}
