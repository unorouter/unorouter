"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePerfMetricsQuery } from "@/hooks/perf-metrics-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  modelName: string;
  className?: string;
};

function formatLatency(ms: number): string {
  if (!ms) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTps(tps: number): string {
  if (!tps) return "—";
  if (tps >= 100) return `${tps.toFixed(0)}`;
  return tps.toFixed(1);
}

function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return "—";
  return `${pct.toFixed(2)}%`;
}

function StatCard(props: {
  label: string;
  value: string;
  hint?: string;
  intent?: "default" | "warning" | "success";
}) {
  const intent = props.intent ?? "default";
  return (
    <div className="border-border bg-background flex flex-col gap-1 rounded-md border p-3">
      <span className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
        {props.label}
      </span>
      <span
        className={cn(
          "text-foreground font-mono text-base font-semibold tabular-nums",
          intent === "warning" && "text-amber-500",
          intent === "success" && "text-emerald-500",
        )}
      >
        {props.value}
      </span>
      {props.hint && (
        <span className="text-muted-foreground/70 text-[10px]">
          {props.hint}
        </span>
      )}
    </div>
  );
}

export function PerformanceSection(props: Props) {
  const t = useTranslations();
  const query = usePerfMetricsQuery(props.modelName, 24);
  const groups = query.data?.groups ?? [];

  if (query.isLoading) {
    return (
      <div className="text-muted-foreground border-border rounded-md border p-4 text-center text-sm">
        {t("MODELS.DETAIL.PERF_LOADING")}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-muted-foreground border-border rounded-md border p-4 text-center text-sm">
        {t("MODELS.DETAIL.PERF_EMPTY")}
      </div>
    );
  }

  const tpsValues = groups.map((g) => g.avg_tps).filter((v) => v > 0);
  const avgTps =
    tpsValues.length > 0
      ? tpsValues.reduce((s, v) => s + v, 0) / tpsValues.length
      : 0;
  const latencyValues = groups.map((g) => g.avg_latency_ms).filter((v) => v > 0);
  const avgLatency =
    latencyValues.length > 0
      ? Math.round(latencyValues.reduce((s, v) => s + v, 0) / latencyValues.length)
      : 0;
  const successValues = groups
    .map((g) => g.success_rate)
    .filter((v) => Number.isFinite(v));
  const avgSuccess =
    successValues.length > 0
      ? successValues.reduce((s, v) => s + v, 0) / successValues.length
      : 0;

  let successIntent: "default" | "warning" | "success" = "warning";
  if (avgSuccess >= 99.9) successIntent = "success";
  else if (avgSuccess >= 99) successIntent = "default";

  // Build a unified latency series across groups by averaging per timestamp.
  const tsMap = new Map<number, number[]>();
  for (const group of groups) {
    for (const point of group.series) {
      if (!point.avg_ttft_ms || point.avg_ttft_ms <= 0) continue;
      const list = tsMap.get(point.ts) ?? [];
      list.push(point.avg_ttft_ms);
      tsMap.set(point.ts, list);
    }
  }
  const series = Array.from(tsMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([ts, values]) => ({
      ts,
      label: new Date(ts * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      ttft_ms: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
    }));

  return (
    <div className={cn("flex flex-col gap-4", props.className)}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatCard
          label={t("MODELS.DETAIL.STAT_TPS")}
          value={formatTps(avgTps)}
          hint={t("MODELS.DETAIL.STAT_TPS_HINT")}
        />
        <StatCard
          label={t("MODELS.DETAIL.STAT_LATENCY")}
          value={formatLatency(avgLatency)}
        />
        <StatCard
          label={t("MODELS.DETAIL.STAT_SUCCESS")}
          value={formatPct(avgSuccess)}
          intent={successIntent}
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table className="text-sm">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground h-9 text-[10px] uppercase tracking-wider">
                {t("MODELS.DETAIL.PERF_GROUP")}
              </TableHead>
              <TableHead className="text-muted-foreground h-9 text-right text-[10px] uppercase tracking-wider">
                {t("MODELS.DETAIL.PERF_TPS")}
              </TableHead>
              <TableHead className="text-muted-foreground h-9 text-right text-[10px] uppercase tracking-wider">
                {t("MODELS.DETAIL.PERF_TTFT")}
              </TableHead>
              <TableHead className="text-muted-foreground h-9 text-right text-[10px] uppercase tracking-wider">
                {t("MODELS.DETAIL.PERF_LATENCY")}
              </TableHead>
              <TableHead className="text-muted-foreground h-9 text-right text-[10px] uppercase tracking-wider">
                {t("MODELS.DETAIL.PERF_SUCCESS")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((group) => (
              <TableRow key={group.group}>
                <TableCell className="py-2 font-mono text-xs">
                  {group.group}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  {formatTps(group.avg_tps)}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  {formatLatency(group.avg_ttft_ms)}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  {formatLatency(group.avg_latency_ms)}
                </TableCell>
                <TableCell className="py-2 text-right font-mono text-xs">
                  {formatPct(group.success_rate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {series.length > 1 && (
        <div className="border-border rounded-md border p-3">
          <div className="text-foreground mb-2 text-xs font-semibold">
            {t("MODELS.DETAIL.PERF_LATENCY_TREND")}
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ top: 5, right: 8, bottom: 0, left: -8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  className="fill-muted-foreground"
                  tickFormatter={(value: number) => `${value}ms`}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    fontFamily: "monospace",
                  }}
                  formatter={(value: number) => [`${value}ms`, "TTFT"]}
                />
                <Line
                  type="monotone"
                  dataKey="ttft_ms"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
