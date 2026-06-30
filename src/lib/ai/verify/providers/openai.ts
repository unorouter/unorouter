import { foreignPatternsExcept } from "../patterns";
import type { BuiltRequest, ProbeRequestArgs, ProviderConfig } from "./config";

type OpenAIChatResponse = {
  error?: unknown;
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

// gpt-5.x / o-series are REASONING models: they spend max_completion_tokens on
// internal reasoning BEFORE any visible text. A small probe budget (60-200) is
// consumed entirely by reasoning and the reply comes back EMPTY (finish_reason
// "length"), which the detector misreads as a blank/mux failure -> a real model
// wrongly marked "unverified". Floor the budget for reasoning models so there's
// room for thinking PLUS the short answer (same fix as Gemini thinking models).
// Non-reasoning models (gpt-4o/4.1) keep the tight probe budget.
const REASONING_MIN_OUTPUT_TOKENS = 2000;
const REASONING_MODEL = /^(?:o[1-9]|gpt-5)/i;

function buildRequest(args: ProbeRequestArgs): BuiltRequest {
  const maxCompletionTokens = REASONING_MODEL.test(args.model)
    ? Math.max(args.maxTokens, REASONING_MIN_OUTPUT_TOKENS)
    : args.maxTokens;
  return {
    url: `${args.baseUrl}/v1/chat/completions`,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${args.apiKey}`,
    },
    // ONLY max_completion_tokens: it works alone on both the gpt-5.x line and older models (gpt-4o/4.1),
    // and many gateways HARD-REJECT sending it together with max_tokens ("not supported at the same time"),
    // which silently failed every GPT probe to `unverified`. Verified live against gpt-4o/gpt-4.1 + gpt-5.x.
    body: {
      model: args.model,
      max_completion_tokens: maxCompletionTokens,
      messages: [{ role: "user", content: args.prompt }],
    },
  };
}

function extractText(data: unknown): string | null {
  const d = data as OpenAIChatResponse;
  if (d.error) return null;
  const content = d.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.toLowerCase() : null;
}

function extractMeta(data: unknown) {
  const d = data as OpenAIChatResponse;
  const u = d.usage;
  return {
    detectedModel: d.model ?? null,
    usage: u
      ? {
          prompt: u.prompt_tokens ?? null,
          completion: u.completion_tokens ?? null,
          total: u.total_tokens ?? null,
        }
      : null,
  };
}

export const openaiConfig: ProviderConfig = {
  provider: "openai",
  buildRequest,
  extractText,
  extractMeta,
  homeIdentityPatterns: ["openai"],
  foreignIdentityPatterns: foreignPatternsExcept("openai"),
  homeModelNamePatterns: ["gpt", "openai", "o1", "o3", "o4"],
  cloudModelNamePatterns: [],
  tiers: null,
  acceptsCloudHostIdentity: false,
};
