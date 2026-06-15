"use client";

import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Icon } from "@/components/ui/icon";
import { useStatusQuery } from "@/hooks/ops/status-hook";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import type { DashboardStore } from "@/store/dashboard-store";
import { dashboardStoreAtom } from "@/store/dashboard-store";
import { dayjs } from "@/lib/utils/format/date";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useRef } from "react";
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
  const setDashboardStore = useSetAtom(dashboardStoreAtom);
  const hydrated = useRef<boolean | null>(null);
  if (hydrated.current == null) {
    hydrated.current = true;
    setDashboardStore(props.serverTimestamps);
  }
  const t = useTranslations();
  const { displayName } = useUserDisplay();
  const statusQuery = useStatusQuery();

  const status = statusQuery.data;

  const hours = dayjs().hour();
  const greetingKey =
    hours >= 5 && hours < 12
      ? "DASHBOARD.GREETING.MORNING"
      : hours >= 12 && hours < 18
        ? "DASHBOARD.GREETING.AFTERNOON"
        : "DASHBOARD.GREETING.EVENING";
  const greeting = t(greetingKey);

  const hasApiInfo = status?.api_info_enabled ?? false;
  const hasAnnouncements = status?.announcements_enabled ?? false;
  const hasFaq = status?.faq_enabled ?? false;
  const hasUptime = status?.uptime_kuma_enabled ?? false;
  const hasInfoRow = hasAnnouncements || hasFaq || hasUptime;

  return (
    <PageContent>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("SIDEBAR.DASHBOARD")}
            </span>
          </div>
          <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
            {greeting}, {displayName}
          </h1>
        </div>
        <div className="text-muted-foreground hidden items-center gap-1.5 md:flex">
          <Icon name="activity" className="h-3 w-3" />
          <span
            className="font-mono text-[10px] tracking-widest uppercase"
            suppressHydrationWarning
          >
            {dayjs().format("MMM D, YYYY")}
          </span>
        </div>
      </div>

      <div className="border-border mb-6 border">
        <StatsCards />
      </div>

      <div
        className={`mb-6 grid gap-6 ${hasApiInfo ? "lg:grid-cols-[1fr_320px]" : ""}`}
      >
        <div className="min-w-0">
          <ConsumptionChart />
        </div>
        {hasApiInfo && <ApiInfoPanel />}
      </div>

      {hasInfoRow && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {hasAnnouncements && <AnnouncementsPanel />}
          {hasFaq && <FaqPanel />}
          {hasUptime && <UptimePanel />}
        </div>
      )}
    </PageContent>
  );
}
