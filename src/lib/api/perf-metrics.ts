import { customFetch } from "@/lib/custom-fetch";

export type PerformanceSeriesPoint = {
  ts: number;
  avg_ttft_ms: number;
  avg_latency_ms: number;
  success_rate: number;
  avg_tps: number;
};

export type PerformanceGroup = {
  group: string;
  avg_ttft_ms: number;
  avg_latency_ms: number;
  success_rate: number;
  avg_tps: number;
  series: PerformanceSeriesPoint[];
};

export type PerformanceMetricsData = {
  model_name: string;
  series_schema?: string;
  groups: PerformanceGroup[];
};

export type PerfModelSummary = {
  model_name: string;
  avg_latency_ms: number;
  success_rate: number;
  avg_tps: number;
  request_count: number;
};

export type PerfSummaryAllData = {
  models: PerfModelSummary[];
};

type Envelope<T> = { success: boolean; message?: string; data: T };

// Upstream's getPerfMetrics / getPerfMetricsSummary in openapi.ts are
// generated with an opaque ApiResponse type and no query params. We hit the
// endpoints directly via customFetch (which still handles retries, timeout,
// and the upstream URL) and apply our own typed envelope shape.
async function fetchEnvelope<T>(
  path: string,
  query: Record<string, string | number | undefined>,
): Promise<T> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const url = params.toString() ? `${path}?${params}` : path;
  const res = await customFetch<{
    status: number;
    data: Envelope<T>;
  }>(url, { method: "GET" });
  if (!res.data?.success) {
    throw new Error(res.data?.message ?? "Failed to fetch perf metrics");
  }
  return res.data.data;
}

export function fetchPerfMetricsSummary(
  hours: number,
): Promise<PerfSummaryAllData> {
  return fetchEnvelope<PerfSummaryAllData>("/api/perf-metrics/summary", {
    hours,
  });
}

export function fetchPerfMetrics(
  model: string,
  hours: number,
): Promise<PerformanceMetricsData> {
  return fetchEnvelope<PerformanceMetricsData>("/api/perf-metrics", {
    model,
    hours,
  });
}
