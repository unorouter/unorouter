import { customFetch } from "@/lib/custom-fetch";
import type {
  PerformanceMetricsData,
  PerfSummaryAllData,
} from "@/lib/api/perf-metrics";
import {
  perfMetricsQuery,
  perfMetricsSummaryQuery,
} from "@/lib/api/typebox/perf-metrics";
import { Elysia } from "elysia";

// Upstream's getPerfMetrics / getPerfMetricsSummary in openapi.ts are
// generated with an opaque ApiResponse type and no query params. We hit the
// endpoints directly via customFetch (which still handles retries, timeout,
// and the upstream URL) and apply our own typed envelope shape.
type Envelope<T> = { success: boolean; message?: string; data: T };

async function fetchEnvelope<T>(
  path: string,
  query: Record<string, string | number | undefined>,
): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const url = params.toString() ? `${path}?${params}` : path;
  const res = await customFetch<{ status: number; data: Envelope<T> }>(url, {
    method: "GET",
  });
  if (!res.data?.success) {
    throw new Error(res.data?.message ?? "Failed to fetch perf metrics");
  }
  return res.data.data;
}

export const perfMetricsRoute = new Elysia({ prefix: "/perf-metrics" })
  .get(
    "/summary",
    async ({ query }) =>
      fetchEnvelope<PerfSummaryAllData>("/api/perf-metrics/summary", {
        hours: query.hours ?? 24,
      }),
    { query: perfMetricsSummaryQuery },
  )
  .get(
    "/",
    async ({ query }) =>
      fetchEnvelope<PerformanceMetricsData>("/api/perf-metrics", {
        model: query.model,
        hours: query.hours ?? 24,
      }),
    { query: perfMetricsQuery },
  );
