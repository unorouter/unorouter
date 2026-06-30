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

function buildRequest(args: ProbeRequestArgs): BuiltRequest {
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
      max_completion_tokens: args.maxTokens,
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
