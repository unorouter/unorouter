import { RankingPeriodSchema } from "@/lib/api/typebox/rankings";
import { t, type Static } from "elysia";

export const modelRankingQuery = t.Object({
  model: t.String(),
  period: t.Optional(RankingPeriodSchema),
});

const ModelRankingPointSchema = t.Object({
  ts: t.String(),
  label: t.String(),
  tokens: t.Number(),
});

export const ModelRankingResponseSchema = t.Object({
  model_name: t.String(),
  period: t.String(),
  rank: t.Number(),
  total_tokens: t.Number(),
  share: t.Number(),
  growth_pct: t.Number(),
  series: t.Array(ModelRankingPointSchema),
});

export type ModelRankingPoint = Static<typeof ModelRankingPointSchema>;
export type ModelRankingResponse = Static<typeof ModelRankingResponseSchema>;
