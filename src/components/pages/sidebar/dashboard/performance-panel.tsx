"use client";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useUsageLogsPerfQuery } from "@/hooks/ops/logs-hook";
import { useTranslations } from "next-intl";

const TOP_MODELS = 6;

// success_rate arrives as a 0-100 percentage, not a fraction.
function rateDot(rate: number) {
  if (rate >= 95) return "bg-green-500";
  if (rate >= 80) return "bg-amber-500";
  return "bg-red-500";
}

function rateText(rate: number) {
  if (rate >= 95) return "text-green-500";
  if (rate >= 80) return "text-amber-500";
  return "text-red-500";
}

export function PerformanceStrip() {
  const t = useTranslations();
  const perfQuery = useUsageLogsPerfQuery(24);
  const summary = perfQuery.data?.summary;
  const models = (perfQuery.data?.models ?? []).slice(0, TOP_MODELS);

  if (perfQuery.isLoading) {
    return (
      <div className="border-border bg-card border p-4">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }
  if (!summary || models.length === 0) return null;

  return (
    <div className="border-border bg-card flex flex-wrap items-center gap-x-6 gap-y-3 border p-4">
      <div className="text-foreground flex items-center gap-1.5">
        <Icon name="heart-pulse" className="h-4 w-4 text-green-500" />
        <span className="text-sm font-semibold">
          {t("DASHBOARD.PANEL.PERFORMANCE")}
        </span>
        <span className="text-muted-foreground text-[11px]">
          {t("DASHBOARD.PANEL.PERFORMANCE_SCOPE")}
        </span>
      </div>

      <Metric
        icon="circle-check"
        label={t("DASHBOARD.PANEL.SUCCESS_RATE")}
        value={`${summary.success_rate.toFixed(2)}%`}
        tone={rateText(summary.success_rate)}
      />
      <Metric
        icon="clock"
        label={t("DASHBOARD.PANEL.AVG_LATENCY")}
        value={`${(summary.avg_latency_ms / 1000).toFixed(2)}s`}
      />
      <Metric
        icon="zap"
        label={t("DASHBOARD.PANEL.THROUGHPUT")}
        value={`${summary.avg_tps.toFixed(1)} t/s`}
      />

      <div className="flex flex-wrap items-center gap-2">
        {models.map((model) => (
          <span
            key={model.model_name}
            className="border-border flex items-center gap-1.5 border px-2 py-1"
          >
            <span
              className="text-foreground max-w-40 truncate font-mono text-[11px]"
              title={model.model_name}
            >
              {model.model_name}
            </span>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${rateDot(model.success_rate)}`}
            />
            <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
              {model.success_rate.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Metric(props: {
  icon: "circle-check" | "clock" | "zap";
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon name={props.icon} className="text-muted-foreground h-3.5 w-3.5" />
      <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
        {props.label}
      </span>
      <span
        className={`font-mono text-xs font-semibold tabular-nums ${props.tone ?? "text-foreground"}`}
      >
        {props.value}
      </span>
    </div>
  );
}
