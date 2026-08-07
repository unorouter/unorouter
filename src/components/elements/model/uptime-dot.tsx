"use client";

import type { ModelStatusInfo } from "@/hooks/models/model-status-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// success -> up, degraded -> some providers, error/empty -> down. Mirrors the
// status page's ComputeModelStatus taxonomy.
const STATUS_COLOR: Record<string, string> = {
  success: "bg-[var(--success)]",
  degraded: "bg-[var(--warning)]",
  error: "bg-[var(--destructive)]",
  empty: "bg-muted",
};

// Tiny per-model reliability dot for the chat model drawer. Colored by current
// status, titled with 24h uptime + providers-up so a flaky free model reads
// visibly worse than a stable one.
export function UptimeDot(props: { info: ModelStatusInfo | undefined }) {
  const t = useTranslations();
  const info = props.info;
  if (!info) return null;
  const color = STATUS_COLOR[info.status] ?? "bg-muted";
  const pct = Math.round(info.uptime24h);
  return (
    <span
      className={cn("h-2 w-2 shrink-0 rounded-full", color)}
      title={t("CHAT.MODEL.UPTIME_TITLE", {
        pct,
        up: info.upChannels,
        total: info.totalChannels,
      })}
      aria-label={t("CHAT.MODEL.UPTIME_TITLE", {
        pct,
        up: info.upChannels,
        total: info.totalChannels,
      })}
    />
  );
}
