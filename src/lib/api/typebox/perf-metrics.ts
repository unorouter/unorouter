import { t } from "elysia";

export const perfMetricsSummaryQuery = t.Object({
  hours: t.Optional(t.Number()),
});

export const perfMetricsQuery = t.Object({
  model: t.String(),
  hours: t.Optional(t.Number()),
});
