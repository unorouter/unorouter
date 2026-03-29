"use client";

import { useStatusQuery } from "@/hooks/status-hook";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { getGreetingKey } from "@/lib/config/constants";
import type { DashboardStore } from "@/store/dashboard-store";
import { dashboardStoreAtom } from "@/store/dashboard-store";
import dayjs from "dayjs";
import { useHydrateAtoms } from "jotai/react/utils";
import { useTranslations } from "next-intl";
import { LuActivity } from "react-icons/lu";
import { AnnouncementsPanel } from "./announcements-panel";
import { ApiInfoPanel } from "./api-info-panel";
import { ConsumptionChart } from "./consumption-chart";
import { FaqPanel } from "./faq-panel";
import { StatsCards } from "./stats-cards";
import { UptimePanel } from "./uptime-panel";

type DashboardProps = {
  serverTimestamps: DashboardStore;
};

export function Dashboard(props: DashboardProps) {
  useHydrateAtoms([[dashboardStoreAtom, props.serverTimestamps]]);
  const t = useTranslations();
  const { displayName } = useUserDisplay();
  const statusQuery = useStatusQuery();

  const status = statusQuery.data;

  const greeting = t(getGreetingKey());

  const hasApiInfo = status?.api_info_enabled ?? false;
  const hasAnnouncements = status?.announcements_enabled ?? false;
  const hasFaq = status?.faq_enabled ?? false;
  const hasUptime = status?.uptime_kuma_enabled ?? false;
  const hasInfoRow = hasAnnouncements || hasFaq || hasUptime;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("SIDEBAR.DASHBOARD")}
            </span>
          </div>
          <h1
            className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl"
            suppressHydrationWarning
          >
            {greeting}, {displayName}
          </h1>
        </div>
        <div className="text-muted-foreground hidden items-center gap-1.5 md:flex">
          <LuActivity className="h-3 w-3" />
          <span
            className="font-mono text-[10px] tracking-widest uppercase"
            suppressHydrationWarning
          >
            {dayjs().format("MMM D, YYYY")}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="border-border mb-6 border">
        <StatsCards />
      </div>

      {/* Charts + API Info */}
      <div
        className={`mb-6 grid gap-6 ${hasApiInfo ? "lg:grid-cols-[1fr_320px]" : ""}`}
      >
        <div className="min-w-0">
          <ConsumptionChart />
        </div>
        {hasApiInfo && <ApiInfoPanel />}
      </div>

      {/* Info Panels */}
      {hasInfoRow && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hasAnnouncements && <AnnouncementsPanel />}
          {hasFaq && <FaqPanel />}
          {hasUptime && <UptimePanel />}
        </div>
      )}
    </div>
  );
}
