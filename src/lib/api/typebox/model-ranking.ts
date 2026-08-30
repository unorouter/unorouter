import { RankingPeriodSchema } from "@/lib/api/typebox/rankings";
import { t } from "elysia";

export const modelRankingQuery = t.Object({
  model: t.String(),
  period: t.Optional(RankingPeriodSchema),
});
