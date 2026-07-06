import { foreignPatternsExcept } from "../patterns";
import type { BuiltRequest, ProbeRequestArgs, ProviderConfig } from "./config";

type AnthropicResponse = {
  type?: string;
  model?: string;
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

function isAnthropicHost(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).host.endsWith("api.anthropic.com");
  } catch {
    return false;
  }
}

function buildRequest(args: ProbeRequestArgs): BuiltRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": args.apiKey,
    "anthropic-version": "2023-06-01",
  };
  if (args.direct && isAnthropicHost(args.baseUrl))
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  return {
    url: `${args.baseUrl}/v1/messages`,
    headers,
    body: {
      model: args.model,
      max_tokens: args.maxTokens,
      messages: [{ role: "user", content: args.prompt }],
    },
  };
}

function extractText(data: unknown): string | null {
  const d = data as AnthropicResponse;
  if (d.type === "error") return null;
  return (d.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join(" ")
    .toLowerCase();
}

function extractMeta(data: unknown) {
  const d = data as AnthropicResponse;
  const u = d.usage;
  const prompt = u?.input_tokens ?? null;
  const completion = u?.output_tokens ?? null;
  return {
    detectedModel: d.model ?? null,
    usage: u
      ? {
          prompt,
          completion,
          total:
            prompt !== null && completion !== null ? prompt + completion : null,
        }
      : null,
  };
}

export const anthropicConfig: ProviderConfig = {
  provider: "anthropic",
  buildRequest,
  extractText,
  extractMeta,
  homeIdentityPatterns: ["anthropic"],
  foreignIdentityPatterns: foreignPatternsExcept("anthropic"),
  homeModelNamePatterns: ["claude", "anthropic"],
  cloudModelNamePatterns: ["amazon q", "q developer", "kiro"],
  tiers: ["opus", "sonnet", "haiku"],
  acceptsCloudHostIdentity: true,
};
