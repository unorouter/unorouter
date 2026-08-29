import { t, type Static } from "elysia";

export const RankingPeriodSchema = t.Union([
  t.Literal("today"),
  t.Literal("week"),
  t.Literal("month"),
  t.Literal("year"),
  t.Literal("all"),
]);

export const rankingsQuery = t.Object({
  period: t.Optional(RankingPeriodSchema),
});

export type RankingPeriod = Static<typeof RankingPeriodSchema>;
