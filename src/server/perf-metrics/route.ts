import {
  fetchPerfMetrics,
  fetchPerfMetricsSummary,
} from "@/lib/api/perf-metrics";
import {
  perfMetricsQuery,
  perfMetricsSummaryQuery,
} from "@/lib/api/typebox/perf-metrics";
import { Elysia } from "elysia";

export const perfMetricsRoute = new Elysia({ prefix: "/perf-metrics" })
  .get(
    "/summary",
    async ({ query }) => fetchPerfMetricsSummary(query.hours ?? 24),
    { query: perfMetricsSummaryQuery },
  )
  .get(
    "/",
    async ({ query }) => fetchPerfMetrics(query.model, query.hours ?? 24),
    { query: perfMetricsQuery },
  );
