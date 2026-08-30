import { t, type Static } from "elysia";
import type { VerifyProviderValue } from "@/lib/validation/model-tester";

export const verifyAndPublishBody = t.Object({
  provider: t.Union([
    t.Literal("anthropic"),
    t.Literal("openai"),
    t.Literal("gemini"),
  ]),
  baseUrl: t.String({ minLength: 1, maxLength: 2048 }),
  apiKey: t.String({ minLength: 1, maxLength: 4096 }),
  model: t.String({ minLength: 1, maxLength: 256 }),
});
export type VerifyAndPublishBody = Static<typeof verifyAndPublishBody>;

export const rankingsQuery = t.Object({
  page: t.Optional(t.Number({ minimum: 1, default: 1 })),
  pageSize: t.Optional(t.Number({ minimum: 1, maximum: 100, default: 20 })),
});

export const rankingDetailParams = t.Object({
  host: t.String({ minLength: 1, maxLength: 256 }),
  model: t.String({ minLength: 1, maxLength: 256 }),
});

export const providerDetailParams = t.Object({
  host: t.String({ minLength: 1, maxLength: 256 }),
});

export const deletePublishedParams = t.Object({
  id: t.String({ minLength: 1, maxLength: 64 }),
});

export type ProviderAggregateRow = {
  baseUrlHost: string;
  provider: VerifyProviderValue;
  modelCount: number;
  sampleCount: number;
  avgPassRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number | null;
  avgTotalTokens: number | null;
  genuineCount: number;
  suspiciousCount: number;
  unverifiedCount: number;
  lastTestedAt: number;
};

export type RankingRecentRow = {
  id: string;
  verdict: "genuine" | "suspicious" | "unverified";
  detectedModel: string | null;
  probesPassed: number;
  probesTotal: number;
  latencyMs: number;
  totalTokens: number | null;
  transport: string | null;
  testedAt: number;
  submitterUserId: number | null;
  submitterUsername: string | null;
};

export type RankingAggregateRow = {
  provider: VerifyProviderValue;
  model: string;
  baseUrlHost: string;
  sampleCount: number;
  avgPassRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number | null;
  avgTotalTokens: number | null;
  genuineCount: number;
  suspiciousCount: number;
  unverifiedCount: number;
  lastTestedAt: number;
};

export type TestResultProbe = {
  label: string;
  pass: boolean;
  transient: boolean;
  signal: string | null;
  reason: string | null;
  prompt: string;
  responseText: string | null;
  httpStatus: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
};

export type TestResultDetail = {
  model: string;
  baseUrlHost: string;
  provider: VerifyProviderValue;
  verdict: "genuine" | "suspicious" | "unverified";
  versionUnverifiable: boolean;
  detectedModel: string | null;
  probesPassed: number;
  probesTotal: number;
  totalTokens: number | null;
  latencyMs: number;
  transport: string;
  resolvedFormat: string;
  formatFellBack: boolean;
  testedAt: number;
  probes: TestResultProbe[];
};
