"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePerfMetricsQuery } from "@/hooks/models/perf-metrics-hook";
import {
  CHART_ACCENT,
  CHART_AXIS_TICK,
  CHART_MARGIN,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "../shared/chart-primitives";
import { StatusBox } from "../shared/status-box";
import { aggregatePerfGroups } from "@/lib/api/perf-aggregate";
import { cn } from "@/lib/utils";
import { formatLatency, formatPct, formatTps } from "@/lib/utils/format/number";
import { type StatIntent, successIntent } from "@/lib/utils/format/math";
import { Icon } from "@/components/ui/icon";
import { modelSlug } from "@/lib/utils/base";
import { useTranslations } from "next-intl";
import { useState } from "react";
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
  hours?: number;
  className?: string;
};

// Group names are `{provider}-{sanitized-model}`; strip the trailing model slug
// so the per-provider rows read as just the provider (trp1, kilo1, nvda1...).
function providerLabel(group: string, modelName: string): string {
  const slug = modelSlug(modelName).replace(/[^a-z0-9]+/gi, "-");
  const suffix = `-${slug}`;
  return group.toLowerCase().endsWith(suffix.toLowerCase())
    ? group.slice(0, group.length - suffix.length)
    : group;
}

const STAT_INTENT_CLASS: Record<StatIntent, string> = {
  default: "",
  warning: "text-amber-700 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
};

function StatCard(props: {
  label: string;
  value: string;
  hint?: string;
  intent?: StatIntent;
}) {
  return (
    <div className="border-border bg-background flex flex-col gap-1 rounded-md border p-3">
      <span className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
        {props.label}
      </span>
      <span
        className={cn(
          "text-foreground font-mono text-base font-semibold tabular-nums",
          STAT_INTENT_CLASS[props.intent ?? "default"],
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
  const [showGroups, setShowGroups] = useState(false);
  const query = usePerfMetricsQuery(props.modelName, props.hours ?? 24);
  const groups = query.data?.groups ?? [];

  if (query.isLoading) {
    return <StatusBox>{t("MODELS.DETAIL.PERF_LOADING")}</StatusBox>;
  }

  if (groups.length === 0) {
    return <StatusBox>{t("MODELS.DETAIL.PERF_EMPTY")}</StatusBox>;
  }

  const perf = aggregatePerfGroups(groups);
  const intent = successIntent(perf.avgSuccess);

  return (
    <div className={cn("flex flex-col gap-4", props.className)}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <StatCard
          label={t("MODELS.DETAIL.STAT_TPS")}
          value={formatTps(perf.avgTps)}
          hint={t("MODELS.DETAIL.STAT_TPS_HINT")}
        />
        <StatCard
          label={t("MODELS.DETAIL.STAT_LATENCY")}
          value={formatLatency(perf.avgLatency)}
          hint={t("MODELS.DETAIL.STAT_LATENCY_HINT")}
        />
        <StatCard
          label={t("MODELS.DETAIL.STAT_SUCCESS")}
          value={formatPct(perf.avgSuccess)}
          hint={t("MODELS.DETAIL.STAT_SUCCESS_HINT")}
          intent={intent}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowGroups((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 self-start font-mono text-[10px] tracking-wider uppercase transition-colors"
      >
        <Icon
          name={showGroups ? "chevron-down" : "chevron-right"}
          className="h-3 w-3"
        />
        {t("MODELS.DETAIL.PERF_PROVIDER_BREAKDOWN", { count: groups.length })}
      </button>

      {showGroups && (
        <div className="overflow-x-auto rounded-md border">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {(
                  [
                    "MODELS.DETAIL.PERF_GROUP",
                    "MODELS.DETAIL.PERF_TPS",
                    "MODELS.DETAIL.PERF_TTFT",
                    "MODELS.DETAIL.PERF_LATENCY",
                    "MODELS.DETAIL.PERF_SUCCESS",
                  ] as const
                ).map((key, i) => (
                  <TableHead
                    key={key}
                    className={cn(
                      "text-muted-foreground h-9 text-[10px] tracking-wider uppercase",
                      i > 0 && "text-right",
                    )}
                  >
                    {t(key)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.group}>
                  {[
                    providerLabel(group.group, props.modelName),
                    formatTps(group.avg_tps),
                    formatLatency(group.avg_ttft_ms),
                    formatLatency(group.avg_latency_ms),
                    formatPct(group.success_rate),
                  ].map((cell, i) => (
                    <TableCell
                      key={i}
                      className={cn(
                        "py-2 font-mono text-xs",
                        i > 0 && "text-right",
                      )}
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {perf.series.length > 1 && (
        <div className="border-border rounded-md border p-3">
          <div className="text-foreground mb-2 text-xs font-semibold">
            {t("MODELS.DETAIL.PERF_LATENCY_TREND")}
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perf.series} margin={CHART_MARGIN}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis
                  dataKey="label"
                  tick={CHART_AXIS_TICK}
                  className="fill-muted-foreground"
                  minTickGap={24}
                />
                <YAxis
                  width={44}
                  tick={CHART_AXIS_TICK}
                  className="fill-muted-foreground"
                  domain={[0, "dataMax"]}
                  allowDecimals={false}
                  tickFormatter={(value: number) => formatLatency(value)}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border)" }}
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  formatter={(value: number) => [
                    formatLatency(value),
                    t("MODELS.DETAIL.PERF_TTFT"),
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="ttft_ms"
                  stroke={CHART_ACCENT}
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
