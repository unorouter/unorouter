import type { PerformanceGroup } from "@/lib/api/perf-metrics";
import { avg } from "@/lib/utils/base";
import { dayjs } from "@/lib/utils/date";

export type AggregatedSeriesPoint = {
  ts: number;
  label: string;
  ttft_ms: number;
};

export type AggregatedPerf = {
  avgTps: number;
  avgLatency: number;
  avgSuccess: number;
  series: AggregatedSeriesPoint[];
};

/** Reduce per-group perf data into summary stats and a unified TTFT series. */
export function aggregatePerfGroups(
  groups: readonly PerformanceGroup[],
): AggregatedPerf {
  const tps: number[] = [];
  const latency: number[] = [];
  const success: number[] = [];
  const ttftByTs = new Map<number, number[]>();

  for (const group of groups) {
    if (group.avg_tps > 0) tps.push(group.avg_tps);
    if (group.avg_latency_ms > 0) latency.push(group.avg_latency_ms);
    if (Number.isFinite(group.success_rate)) success.push(group.success_rate);
    for (const point of group.series) {
      if (!point.avg_ttft_ms || point.avg_ttft_ms <= 0) continue;
      const list = ttftByTs.get(point.ts) ?? [];
      list.push(point.avg_ttft_ms);
      ttftByTs.set(point.ts, list);
    }
  }

  const series = Array.from(ttftByTs.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, values]) => ({
      ts,
      label: dayjs(ts * 1000).format("HH:mm"),
      ttft_ms: Math.round(avg(values)),
    }));

  return {
    avgTps: avg(tps),
    avgLatency: Math.round(avg(latency)),
    avgSuccess: avg(success),
    series,
  };
}
