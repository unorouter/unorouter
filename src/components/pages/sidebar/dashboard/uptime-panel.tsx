"use client";

import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardUptimeQuery } from "@/hooks/billing/dashboard-hook";
import { useStatusQuery } from "@/hooks/ops/status-hook";
import { analytics } from "@/lib/analytics";
import { intentDotClass, type IntentType } from "@/lib/config/intent-styles";
import { useTranslations } from "next-intl";
import { useState } from "react";

const MONITOR_INTENT: Record<number, IntentType> = {
  0: "error",
  1: "success",
  2: "warning",
};

export function UptimePanel() {
  const t = useTranslations();
  const statusQuery = useStatusQuery();
  const uptimeQuery = useDashboardUptimeQuery();

  const status = statusQuery.data;

  const [activeCategory, setActiveCategory] = useState<string>("");

  if (!status?.uptime_kuma_enabled) return null;

  const groups = uptimeQuery.data ?? [];
  const isLoading = uptimeQuery.isLoading;

  const selectedCategory = activeCategory || groups[0]?.categoryName || "";
  const activeGroup = groups.find((g) => g.categoryName === selectedCategory);
  const monitors = activeGroup?.monitors ?? [];

  function getStatusLabel(s: number | undefined): string {
    if (s === 1) return t("DASHBOARD.MONITOR.UP");
    if (s === 0) return t("DASHBOARD.MONITOR.DOWN");
    return t("DASHBOARD.MONITOR.PENDING");
  }

  return (
    <div className="border-border bg-card flex flex-col border">
      <div className="border-border flex items-center gap-2 border-b p-5">
        <Icon name="shield" className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground font-mono text-sm font-medium">
          {t("DASHBOARD.PANEL.SERVICE_STATUS")}
        </span>
        <a
          href="#"
          className="text-muted-foreground hover:text-foreground ml-auto transition-colors"
        >
          <Icon name="external-link" className="h-3.5 w-3.5" />
        </a>
      </div>

      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2">
          <Icon
            name="shield"
            className="text-muted-foreground h-8 w-8 opacity-20"
          />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("DASHBOARD.NO_DATA")}
          </span>
        </div>
      ) : (
        <>
          {groups.length > 1 && (
            <div className="border-border bg-border flex gap-px overflow-x-auto border-b">
              {groups.map((group) => (
                <button
                  key={group.categoryName}
                  onClick={() => {
                    const category = group.categoryName ?? "";
                    analytics.dashboard.uptimeCategoryChanged({ category });
                    setActiveCategory(category);
                  }}
                  className={`bg-card px-3 py-2 font-mono text-[10px] tracking-widest uppercase transition-colors ${
                    selectedCategory === group.categoryName
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {group.categoryName}
                </button>
              ))}
            </div>
          )}

          <div className="max-h-64 flex-1 overflow-y-auto">
            <div className="divide-border divide-y">
              {monitors.map((monitor, i) => {
                const colors = intentDotClass(
                  MONITOR_INTENT[monitor.status ?? 2] ?? "warning",
                );
                return (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <div
                      className={`flex h-5 w-5 items-center justify-center ${colors.bg}`}
                    >
                      <div
                        className={`h-1.5 w-1.5 rounded-full ${colors.dot}`}
                      />
                    </div>
                    <span className="text-foreground flex-1 font-mono text-xs">
                      {monitor.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {getStatusLabel(monitor.status)}
                      </span>
                      {monitor.uptime !== undefined && (
                        <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                          {monitor.uptime.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
