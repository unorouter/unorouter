import {
  perfMetricsQuery,
  perfMetricsSummaryQuery,
} from "@/lib/api/typebox/perf-metrics";
import { unwrap } from "@/lib/utils/base";
import { getPerfMetrics } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { fetchPerfSummary } from "@/server/models/perf-metrics/perf-metrics.service";
import { Elysia } from "elysia";

export const perfMetricsRoute = new Elysia({ prefix: "/perf-metrics" })
  .get("/summary", async ({ query }) => fetchPerfSummary(query.hours ?? 24), {
    query: perfMetricsSummaryQuery,
  })
  .get(
    "/",
    async ({ query }) => {
      const res = await getPerfMetrics(
        { model: query.model, hours: query.hours ?? 24 },
        { headers: ADMIN_HEADERS },
      );
      return unwrap(res).data;
    },
    { query: perfMetricsQuery },
  );
