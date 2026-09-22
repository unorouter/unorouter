import {
  perfMetricsModelTotals,
  perfMetricsQuery,
  perfMetricsSummaryQuery,
} from "@/lib/api/typebox/perf-metrics";
import { msg } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getPerfMetrics } from "@/openapi";
import { fetchPerfSummary } from "@/server/models/perf-metrics/perf-metrics.service";
import { Value } from "@sinclair/typebox/value";
import { Elysia } from "elysia";

export const perfMetricsRoute = new Elysia({ prefix: "/perf-metrics" })
  .get("/summary", async ({ query }) => fetchPerfSummary(query.hours ?? 24), {
    query: perfMetricsSummaryQuery,
  })
  .get(
    "/",
    async ({ query }) => {
      const res = await getPerfMetrics({
        model: query.model,
        hours: query.hours ?? 24,
      });
      const data = unwrap(res).data;
      if (!Value.Check(perfMetricsModelTotals, data))
        throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
      return data;
    },
    { query: perfMetricsQuery },
  );
