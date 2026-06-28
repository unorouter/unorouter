import type { ProbeUsage, VerifyProvider } from "../types";
import { anthropicConfig } from "./anthropic";
import { geminiConfig } from "./gemini";
import { openaiConfig } from "./openai";

export type ProbeMeta = {
  detectedModel: string | null;
  usage: ProbeUsage | null;
};

export type ProbeRequestArgs = {
  baseUrl: string;
  apiKey: string;
  model: string;
  prompt: string;
  maxTokens: number;
  direct: boolean;
};

export type BuiltRequest = {
  url: string;
  headers: Record<string, string>;
  body: unknown;
};

// A provider entry is the entire per-model expectation surface. Adding a new
// proprietary model = adding one of these (hand-curated, extensible).
export type ProviderConfig = {
  provider: VerifyProvider;
  buildRequest: (args: ProbeRequestArgs) => BuiltRequest;
  extractText: (data: unknown) => string | null;
  // The model id the upstream reports + token usage, when present in the body.
  extractMeta: (data: unknown) => ProbeMeta;
  // identity probe: home vendor accepted, the others flagged foreign.
  homeIdentityPatterns: string[];
  foreignIdentityPatterns: string[];
  // model-name probe: which strings prove the home model.
  homeModelNamePatterns: string[];
  cloudModelNamePatterns: string[];
  // tier system (anthropic-only); null disables tier-mismatch detection.
  tiers: readonly string[] | null;
  // anthropic accepts AWS/GCP host names on the identity probe.
  acceptsCloudHostIdentity: boolean;
};

export const PROVIDER_CONFIGS: Record<VerifyProvider, ProviderConfig> = {
  anthropic: anthropicConfig,
  openai: openaiConfig,
  gemini: geminiConfig,
};
