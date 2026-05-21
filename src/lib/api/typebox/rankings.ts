import { t, type Static } from "elysia";

export const RankingPeriodSchema = t.Union([
  t.Literal("today"),
  t.Literal("week"),
  t.Literal("month"),
  t.Literal("year"),
  t.Literal("all"),
]);

// The literal values, derived from the schema so the list cannot drift.
export const RANKING_PERIODS = RankingPeriodSchema.anyOf.map(
  (l) => l.const,
);

export const rankingsQuery = t.Object({
  period: t.Optional(RankingPeriodSchema),
});

export const RankedModelSchema = t.Object({
  rank: t.Number(),
  previous_rank: t.Optional(t.Nullable(t.Number())),
  model_name: t.String(),
  vendor: t.String(),
  vendor_icon: t.Optional(t.String()),
  category: t.String(),
  total_tokens: t.Number(),
  share: t.Number(),
  growth_pct: t.Number(),
});

export const RankedVendorSchema = t.Object({
  rank: t.Number(),
  vendor: t.String(),
  vendor_icon: t.Optional(t.String()),
  total_tokens: t.Number(),
  share: t.Number(),
  growth_pct: t.Number(),
  models_count: t.Number(),
  top_model: t.String(),
});

export const RankingMoverSchema = t.Object({
  model_name: t.String(),
  vendor: t.String(),
  vendor_icon: t.Optional(t.String()),
  rank_delta: t.Number(),
  current_rank: t.Number(),
  growth_pct: t.Number(),
});

export const ModelHistoryPointSchema = t.Object({
  ts: t.String(),
  label: t.String(),
  model: t.String(),
  vendor: t.String(),
  tokens: t.Number(),
});

export const ModelHistoryModelSchema = t.Object({
  name: t.String(),
  vendor: t.String(),
  total: t.Number(),
});

export const ModelHistorySeriesSchema = t.Object({
  points: t.Array(ModelHistoryPointSchema),
  models: t.Array(ModelHistoryModelSchema),
  buckets: t.Number(),
});

export const VendorSharePointSchema = t.Object({
  ts: t.String(),
  label: t.String(),
  vendor: t.String(),
  share: t.Number(),
  tokens: t.Number(),
});

export const VendorShareVendorSchema = t.Object({
  name: t.String(),
  total: t.Number(),
  share: t.Number(),
});

export const VendorShareSeriesSchema = t.Object({
  points: t.Array(VendorSharePointSchema),
  vendors: t.Array(VendorShareVendorSchema),
  buckets: t.Number(),
});

export const RankingsResponseSchema = t.Object({
  models: t.Array(RankedModelSchema),
  vendors: t.Array(RankedVendorSchema),
  top_movers: t.Array(RankingMoverSchema),
  top_droppers: t.Array(RankingMoverSchema),
  models_history: ModelHistorySeriesSchema,
  vendor_share_history: VendorShareSeriesSchema,
});

export type RankingPeriod = Static<typeof RankingPeriodSchema>;
export type RankedModel = Static<typeof RankedModelSchema>;
export type RankedVendor = Static<typeof RankedVendorSchema>;
export type RankingMover = Static<typeof RankingMoverSchema>;
export type ModelHistoryPoint = Static<typeof ModelHistoryPointSchema>;
export type ModelHistoryModel = Static<typeof ModelHistoryModelSchema>;
export type ModelHistorySeries = Static<typeof ModelHistorySeriesSchema>;
export type VendorSharePoint = Static<typeof VendorSharePointSchema>;
export type VendorShareVendor = Static<typeof VendorShareVendorSchema>;
export type VendorShareSeries = Static<typeof VendorShareSeriesSchema>;
export type RankingsResponse = Static<typeof RankingsResponseSchema>;
