import type { ProcessedModel } from "@/lib/api/pricing";
import { CHAT_PROVIDER_NAME } from "@/lib/config/constants";
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
  // Only put max_tokens on the wire when the user set one (or a free-model cap
  // applies). Metadata output ceilings drift from what upstreams enforce, and a
  // too-high literal max_tokens is a hard 400 on strict providers.
  const userSetMax = assembled.sampling.maxOutputTokens != null;
  return stripUnsupported(
    defined({
      maxOutputTokens:
        userSetMax || modelInfo?.isFree
          ? effectiveMaxOutputTokens || undefined
          : undefined,
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
    // openai-compatible reads providerOptions ONLY under its provider name;
    // any other key (this object once sat under "openai") is silently dropped
    // and none of these fields ever reach the wire.
    [CHAT_PROVIDER_NAME]: {
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
        // camelCase: the sdk maps its known reasoningEffort option to
        // reasoning_effort on the wire; the snake_case name is not recognized.
        reasoningEffort: assembled.reasoningEffort,
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

// A request log is written PER MESSAGE and stores the whole assembled
// conversation, so a 75-turn chat writes turn 1 seventy-five times: the table
// grows quadratically with thread length. That is survivable for text, but an
// inline `data:` URI (a pasted image, an attachment, a generated video - single
// parts of 3-4MB were measured on a real profile) gets copied into every
// subsequent log in the thread and is what drives these databases past 500MB,
// at which point they can no longer be exported or imported on a phone.
//
// The log exists to reproduce a request (curl) and inspect the prompt, and
// neither needs the bytes. Keep the shape and the text; replace media payloads
// with a marker and cap runaway text.
const MAX_LOGGED_TEXT = 20_000;
const DATA_URI_IN_TEXT = /data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/=]+/g;

function leanParts(parts: unknown): unknown {
  if (!Array.isArray(parts)) return parts;
  return parts.map((part) => {
    if (!part || typeof part !== "object") return part;
    const p = part as Record<string, unknown>;
    const out: Record<string, unknown> = { ...p };
    for (const key of ["url", "data", "image", "text"]) {
      const v = out[key];
      if (typeof v !== "string") continue;
      if (v.startsWith("data:")) {
        // Keep the mime type, drop the payload.
        out[key] =
          `${v.slice(0, v.indexOf(",") + 1)}<${v.length} bytes elided>`;
      } else if (v.includes(";base64,")) {
        // The heaviest rows measured were markdown wrapping a data URI
        // (`![video](data:video/mp4;base64,...)`), which does not START with
        // `data:` and so would only get length-truncated, keeping megabytes.
        // Gate on a plain substring, not regex.test: a /g regex carries
        // lastIndex between calls and would skip matches on later strings.
        out[key] = v.replace(
          DATA_URI_IN_TEXT,
          (m) => `${m.slice(0, m.indexOf(",") + 1)}<${m.length} bytes elided>`,
        );
      } else if (v.length > MAX_LOGGED_TEXT) {
        out[key] =
          `${v.slice(0, MAX_LOGGED_TEXT)}<truncated ${v.length - MAX_LOGGED_TEXT} chars>`;
      }
    }
    return out;
  });
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
    parts: leanParts((m as { parts?: unknown }).parts),
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
    // The system block is identical on every turn of a conversation and is
    // routinely tens of KB (a character card plus lorebook entries), so storing
    // it whole per message is the second multiplier after the messages array.
    assembledSystem: effectiveSystem
      ? effectiveSystem.length > MAX_LOGGED_TEXT
        ? `${effectiveSystem.slice(0, MAX_LOGGED_TEXT)}<truncated ${effectiveSystem.length - MAX_LOGGED_TEXT} chars>`
        : effectiveSystem
      : null,
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
