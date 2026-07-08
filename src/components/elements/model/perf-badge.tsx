"use client";

import type { ModelSummary } from "@/openapi";
import { cn } from "@/lib/utils";
import { formatLatency, formatTps } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";

type Props = {
  perf: ModelSummary | undefined;
  className?: string;
  compact?: boolean;
};

function statusClass(success: number): string {
  if (!Number.isFinite(success)) return "bg-muted-foreground/40";
  if (success >= 99.9) return "bg-emerald-500";
  if (success >= 99) return "bg-emerald-400";
  if (success >= 95) return "bg-amber-500";
  return "bg-rose-500";
}

export function PerfBadge(props: Props) {
  const t = useTranslations();
  if (!props.perf) return null;
  if (props.perf.request_count <= 0) return null;

  const latency = formatLatency(props.perf.avg_latency_ms, 1);
  const tps = formatTps(props.perf.avg_tps, "t/s");
  const dot = (
    <span
      className={cn(
        "h-2 w-2 shrink-0 rounded-full",
        statusClass(props.perf.success_rate),
      )}
      title={`${props.perf.success_rate.toFixed(2)}%`}
    />
  );

  if (props.compact) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex items-center gap-2 font-mono text-[10px] tabular-nums",
          props.className,
        )}
      >
        <span className="text-foreground">{latency}</span>
        <span className="text-muted-foreground/40">·</span>
        <span className="text-foreground">{tps}</span>
        <span className="text-muted-foreground/40">·</span>
        {dot}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 font-mono text-[10px] tabular-nums",
        props.className,
      )}
    >
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-muted-foreground/60 tracking-wider uppercase">
          {t("MODELS.PERF.LATENCY")}
        </span>
        <span className="text-foreground">{latency}</span>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-muted-foreground/60 tracking-wider uppercase">
          {t("MODELS.PERF.TPS")}
        </span>
        <span className="text-foreground">{tps}</span>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-muted-foreground/60 tracking-wider uppercase">
          {t("MODELS.PERF.STATUS")}
        </span>
        <span className="flex h-3.5 items-center">{dot}</span>
      </div>
    </div>
  );
}
