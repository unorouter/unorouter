import { t } from "elysia";

export const perfMetricsSummaryQuery = t.Object({
  hours: t.Optional(t.Number()),
});

export const perfMetricsQuery = t.Object({
  model: t.String(),
  hours: t.Optional(t.Number()),
});

// The backend sends these but src/openapi.ts predates them; drop this schema
// once `bun openapi` picks them up.
export const perfMetricsModelTotals = t.Object({
  summary: t.Union([
    t.Object({
      avg_latency_ms: t.Number(),
      success_rate: t.Number(),
      avg_tps: t.Number(),
    }),
    t.Null(),
  ]),
  series: t.Union([
    t.Array(
      t.Object({
        ts: t.Number(),
        avg_ttft_ms: t.Number(),
        avg_latency_ms: t.Number(),
        success_rate: t.Number(),
        avg_tps: t.Number(),
      }),
    ),
    t.Null(),
  ]),
});
