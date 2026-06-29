import { t, type Static } from "elysia";

const verdict = t.Union([
  t.Literal("genuine"),
  t.Literal("suspicious"),
  t.Literal("unverified"),
]);

// Publish payload: host + verdict + counts + detected model + tokens. NO key,
// NO full URL, NO probe prompt/response text ever.
export const publishTestBody = t.Object({
  provider: t.String({ minLength: 1, maxLength: 64 }),
  model: t.String({ minLength: 1, maxLength: 256 }),
  baseUrlHost: t.String({ minLength: 1, maxLength: 256 }),
  verdict,
  versionUnverifiable: t.Boolean(),
  detectedModel: t.Optional(t.Union([t.String({ maxLength: 256 }), t.Null()])),
  probesPassed: t.Number({ minimum: 0 }),
  probesTotal: t.Number({ minimum: 0 }),
  latencyMs: t.Number({ minimum: 0 }),
  totalTokens: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
  testedAt: t.Number(),
});
export type PublishTestBody = Static<typeof publishTestBody>;

// Server-verify publish: the server runs the whole test with the key and stores
// its OWN verdict, so a published result cannot be forged by the client.
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

// Level 1 row: one provider (grouped by host) with its model count + stats.
export type ProviderAggregateRow = {
  baseUrlHost: string;
  provider: string;
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

// One published submission shown in the ranking detail (no probe text). The
// submitter fields let the UI offer a self-delete to the row's logged-in owner.
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
  provider: string;
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
