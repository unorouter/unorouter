"use client";

import type { PerfModelSummary } from "@/lib/api/perf-metrics";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  perf: PerfModelSummary | undefined;
  className?: string;
};

function formatLatency(ms: number): string {
  if (!ms) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTps(tps: number): string {
  if (!tps) return "—";
  if (tps >= 100) return `${tps.toFixed(0)}t/s`;
  return `${tps.toFixed(1)}t/s`;
}

function statusClass(success: number): string {
  if (!Number.isFinite(success)) return "bg-muted-foreground/40";
  if (success >= 99.9) return "bg-emerald-500";
  if (success >= 99) return "bg-emerald-400";
  if (success >= 95) return "bg-amber-500";
  return "bg-rose-500";
}

/**
 * Compact 3-cell perf summary rendered on /models cards and list items.
 * Hides itself when no data is available; never substitutes fallback values.
 */
export function PerfBadge(props: Props) {
  const t = useTranslations();
  if (!props.perf) return null;
  if (props.perf.request_count <= 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 font-mono text-[10px] tabular-nums",
        props.className,
      )}
    >
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-muted-foreground/60 uppercase tracking-wider">
          {t("MODELS.PERF.LATENCY")}
        </span>
        <span className="text-foreground">
          {formatLatency(props.perf.avg_latency_ms)}
        </span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-muted-foreground/60 uppercase tracking-wider">
          {t("MODELS.PERF.TPS")}
        </span>
        <span className="text-foreground">{formatTps(props.perf.avg_tps)}</span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-muted-foreground/60 uppercase tracking-wider">
          {t("MODELS.PERF.STATUS")}
        </span>
        <span className="flex h-3.5 items-center">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              statusClass(props.perf.success_rate),
            )}
            title={`${props.perf.success_rate.toFixed(2)}%`}
          />
        </span>
      </div>
    </div>
  );
}
