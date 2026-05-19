import {
  perfMetricsQuery,
  perfMetricsSummaryQuery,
} from "@/lib/api/typebox/perf-metrics";
import { unwrap } from "@/lib/utils/base";
import { getPerfMetrics, getPerfMetricsSummary } from "@/openapi";
import { Elysia } from "elysia";

export const perfMetricsRoute = new Elysia({ prefix: "/perf-metrics" })
  .get(
    "/summary",
    async ({ query }) => {
      const res = await getPerfMetricsSummary({ hours: query.hours ?? 24 });
      return unwrap(res).data;
    },
    { query: perfMetricsSummaryQuery },
  )
  .get(
    "/",
    async ({ query }) => {
      const res = await getPerfMetrics({
        model: query.model,
        hours: query.hours ?? 24,
      });
      return unwrap(res).data;
    },
    { query: perfMetricsQuery },
  );
