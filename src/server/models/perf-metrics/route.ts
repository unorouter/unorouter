import {
  perfMetricsQuery,
  perfMetricsSummaryQuery,
} from "@/lib/api/typebox/perf-metrics";
import { PUBLIC_CACHE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getPerfMetrics, getPerfMetricsSummary } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { Elysia } from "elysia";

export const perfMetricsRoute = new Elysia({ prefix: "/perf-metrics" })
  .get(
    "/summary",
    async ({ query }) => {
      const res = await getPerfMetricsSummary(
        { hours: query.hours ?? 24 },
        { headers: ADMIN_HEADERS, ...PUBLIC_CACHE },
      );
      return unwrap(res).data;
    },
    { query: perfMetricsSummaryQuery },
  )
  .get(
    "/",
    async ({ query }) => {
      const res = await getPerfMetrics(
        { model: query.model, hours: query.hours ?? 24 },
        { headers: ADMIN_HEADERS, ...PUBLIC_CACHE },
      );
      return unwrap(res).data;
    },
    { query: perfMetricsQuery },
  );
