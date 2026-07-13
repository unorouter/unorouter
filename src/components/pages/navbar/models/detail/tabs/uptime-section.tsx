"use client";

import { StatusBar, StatusBarSkeleton } from "@/components/ui/status/status-bar";
import type { StatusBarData } from "@/components/ui/status/status.types";
import { useModelStatusBucketsQuery } from "@/hooks/models/model-status-hook";
import type { StatusBucket } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/utils/format/number";
import { type StatIntent, successIntent } from "@/lib/utils/format/math";
import { useTranslations } from "next-intl";
import { StatusBox } from "../shared/status-box";

type Props = {
  model: string;
  bucket?: StatusBucket;
  hours?: number;
  className?: string;
};

const STAT_INTENT_CLASS: Record<StatIntent, string> = {
  default: "",
  warning: "text-amber-700 dark:text-amber-400",
  success: "text-emerald-700 dark:text-emerald-400",
};

// A bucket dominated by "success" counts as up; "degraded" as half-up; "error"
// as down. Empty buckets (no probe) are excluded from the denominator.
function uptimeFromSeries(series: StatusBarData[]): number | null {
  let up = 0;
  let total = 0;
  for (const point of series) {
    const ok = point.bar.find((s) => s.status === "success")?.height ?? 0;
    const deg = point.bar.find((s) => s.status === "degraded")?.height ?? 0;
    const err = point.bar.find((s) => s.status === "error")?.height ?? 0;
    const measured = ok + deg + err;
    if (measured <= 0) continue;
    total += measured;
    up += ok + deg / 2;
  }
  return total > 0 ? (up * 100) / total : null;
}

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

export function UptimeSection(props: Props) {
  const t = useTranslations();
  const query = useModelStatusBucketsQuery(
    props.model,
    props.bucket ?? "15m",
    props.hours ?? 24,
  );

  if (query.isLoading) {
    return <StatusBarSkeleton />;
  }

  const series = query.data ?? [];
  if (series.length === 0) {
    return <StatusBox>{t("MODELS.DETAIL.UPTIME_EMPTY")}</StatusBox>;
  }

  const uptime = uptimeFromSeries(series);
  const intent = uptime === null ? "default" : successIntent(uptime);

  return (
    <div className={cn("flex flex-col gap-4", props.className)}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <StatCard
          label={t("MODELS.DETAIL.STAT_UPTIME")}
          value={uptime === null ? "-" : formatPct(uptime)}
          hint={t("MODELS.DETAIL.STAT_UPTIME_HINT")}
          intent={intent}
        />
        <StatCard
          label={t("MODELS.DETAIL.STAT_WINDOW")}
          value={
            (props.hours ?? 24) >= 168
              ? t("MODELS.DETAIL.WINDOW_7D")
              : t("MODELS.DETAIL.WINDOW_24H")
          }
          hint={t("MODELS.DETAIL.STAT_WINDOW_HINT")}
        />
      </div>

      <div className="border-border rounded-md border p-3">
        <StatusBar data={series} />
      </div>
    </div>
  );
}
