import { foreignPatternsExcept } from "../patterns";
import type { BuiltRequest, ProbeRequestArgs, ProviderConfig } from "./config";

type GeminiResponse = {
  error?: unknown;
  modelVersion?: string;
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

const GEMINI_MIN_OUTPUT_TOKENS = 1024;

function buildRequest(args: ProbeRequestArgs): BuiltRequest {
  return {
    url: `${args.baseUrl}/v1beta/models/${args.model}:generateContent`,
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": args.apiKey,
    },
    body: {
      contents: [{ role: "user", parts: [{ text: args.prompt }] }],
      generationConfig: {
        maxOutputTokens: Math.max(args.maxTokens, GEMINI_MIN_OUTPUT_TOKENS),
      },
    },
  };
}

function extractText(data: unknown): string | null {
  const d = data as GeminiResponse;
  if (d.error) return null;
  const parts = d.candidates?.[0]?.content?.parts;
  if (!parts) return null;
  return parts
    .map((p) => p.text ?? "")
    .join(" ")
    .toLowerCase();
}

function extractMeta(data: unknown) {
  const d = data as GeminiResponse;
  const u = d.usageMetadata;
  return {
    detectedModel: d.modelVersion ?? null,
    usage: u
      ? {
          prompt: u.promptTokenCount ?? null,
          completion: u.candidatesTokenCount ?? null,
          total: u.totalTokenCount ?? null,
        }
      : null,
  };
}

export const geminiConfig: ProviderConfig = {
  provider: "gemini",
  buildRequest,
  extractText,
  extractMeta,
  homeIdentityPatterns: ["google", "deepmind"],
  foreignIdentityPatterns: foreignPatternsExcept("google"),
  homeModelNamePatterns: ["gemini", "google"],
  cloudModelNamePatterns: [],
  tiers: null,
  acceptsCloudHostIdentity: false,
};
