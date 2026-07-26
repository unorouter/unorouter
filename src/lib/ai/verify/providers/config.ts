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

const VERSION_SUFFIX = /\/(?:v\d+(?:alpha|beta)?)\/*$/i;

/** Providers append their own version segment, so a pasted one would double it. */
export function normalizeProbeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "").replace(VERSION_SUFFIX, "");
}

export type ProviderConfig = {
  provider: VerifyProvider;
  buildRequest: (args: ProbeRequestArgs) => BuiltRequest;
  extractText: (data: unknown) => string | null;
  extractMeta: (data: unknown) => ProbeMeta;
  homeIdentityPatterns: string[];
  foreignIdentityPatterns: string[];
  homeModelNamePatterns: string[];
  cloudModelNamePatterns: string[];
  tiers: readonly string[] | null;
  acceptsCloudHostIdentity: boolean;
};

export const PROVIDER_CONFIGS: Record<VerifyProvider, ProviderConfig> = {
  anthropic: anthropicConfig,
  openai: openaiConfig,
  gemini: geminiConfig,
};
