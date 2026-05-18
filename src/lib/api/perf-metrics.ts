// Perf-metrics response shapes. Upstream new-api's OpenAPI spec types these
// endpoints as opaque `ApiResponse`, so we maintain the real shapes here.
// Consumed by:
//   - src/server/perf-metrics/route.ts (BFF passthrough)
//   - src/lib/api/perf-aggregate.ts (reducer)
//   - models, status, perf-badge UI

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
