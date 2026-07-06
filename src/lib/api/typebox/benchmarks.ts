import { t, type Static } from "elysia";

export const benchmarksQuery = t.Object({
  model: t.String(),
});

const LmArenaRowSchema = t.Object({
  board: t.String(),
  rank: t.Number(),
  score: t.Number(),
  ci: t.Number(),
  votes: t.Number(),
});

const BenchLmCategorySchema = t.Object({
  key: t.String(),
  score: t.Number(),
});

const BenchLmResultSchema = t.Object({
  overall: t.Nullable(t.Number()),
  categories: t.Array(BenchLmCategorySchema),
});

const DesignArenaRowSchema = t.Object({
  category: t.String(),
  elo: t.Number(),
  winRate: t.Number(),
  percentile: t.Number(),
});

export const BenchmarksResponseSchema = t.Object({
  lmarena: t.Nullable(t.Array(LmArenaRowSchema)),
  benchlm: t.Nullable(BenchLmResultSchema),
  designArena: t.Nullable(t.Array(DesignArenaRowSchema)),
  llmStats: t.Nullable(t.Unknown()),
});

export type LmArenaRow = Static<typeof LmArenaRowSchema>;
export type BenchLmResult = Static<typeof BenchLmResultSchema>;
export type DesignArenaRow = Static<typeof DesignArenaRowSchema>;
export type BenchmarksResponse = Static<typeof BenchmarksResponseSchema>;
