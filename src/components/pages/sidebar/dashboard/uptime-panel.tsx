"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardUptimeQuery } from "@/hooks/dashboard-hook";
import { useStatusQuery } from "@/hooks/status-hook";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuExternalLink, LuShield } from "react-icons/lu";

type Monitor = {
  name?: string;
  status?: number;
  uptime?: number;
};

const STATUS_COLORS: Record<number, { bg: string; dot: string }> = {
  0: { bg: "bg-red-500/10", dot: "bg-red-500" },
  1: { bg: "bg-green-500/10", dot: "bg-green-500" },
  2: { bg: "bg-yellow-500/10", dot: "bg-yellow-500" },
};

export function UptimePanel() {
  const t = useTranslations();
  const statusQuery = useStatusQuery();
  const uptimeQuery = useDashboardUptimeQuery();

  const status = statusQuery.data as
    | { uptime_kuma_enabled?: boolean }
    | undefined;

  const [activeCategory, setActiveCategory] = useState<string>("");

  if (!status?.uptime_kuma_enabled) return null;

  const groups = uptimeQuery.data ?? [];
  const isLoading = uptimeQuery.isLoading;

  const selectedCategory = activeCategory || groups[0]?.categoryName || "";
  const activeGroup = groups.find((g) => g.categoryName === selectedCategory);
  const monitors = activeGroup?.monitors ?? [];

  function getStatusLabel(s: number | undefined): string {
    if (s === 1) return t("DASHBOARD.MONITOR_UP");
    if (s === 0) return t("DASHBOARD.MONITOR_DOWN");
    return t("DASHBOARD.MONITOR_PENDING");
  }

  return (
    <div className="border-border bg-card flex flex-col border">
      <div className="border-border flex items-center gap-2 border-b p-5">
        <LuShield className="text-muted-foreground h-4 w-4" />
        <span className="text-foreground font-mono text-sm font-medium">
          {t("DASHBOARD.SERVICE_STATUS")}
        </span>
        <a
          href="#"
          className="text-muted-foreground hover:text-foreground ml-auto transition-colors"
        >
          <LuExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {isLoading ? (
        <div className="p-5">
          <Skeleton className="h-32 w-full" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-2">
          <LuShield className="text-muted-foreground h-8 w-8 opacity-20" />
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
                  onClick={() => setActiveCategory(group.categoryName ?? "")}
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
                const colors =
                  STATUS_COLORS[monitor.status ?? 2] ?? STATUS_COLORS[2];
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
