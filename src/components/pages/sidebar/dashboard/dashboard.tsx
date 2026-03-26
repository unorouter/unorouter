"use client";

import { useStatusQuery } from "@/hooks/status-hook";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { getGreetingKey } from "@/lib/config/constants";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LuActivity } from "react-icons/lu";
import { AnnouncementsPanel } from "./announcements-panel";
import { ApiInfoPanel } from "./api-info-panel";
import { ConsumptionChart } from "./consumption-chart";
import { FaqPanel } from "./faq-panel";
import { StatsCards } from "./stats-cards";
import { UptimePanel } from "./uptime-panel";

export function Dashboard() {
  const t = useTranslations();
  const { displayName } = useUserDisplay();
  const statusQuery = useStatusQuery();

  const status = statusQuery.data;

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const greeting = mounted ? t(getGreetingKey()) : "";
  const dateStr = mounted ? dayjs().format("MMM D, YYYY") : "";

  const hasApiInfo = status?.api_info_enabled ?? false;
  const hasAnnouncements = status?.announcements_enabled ?? false;
  const hasFaq = status?.faq_enabled ?? false;
  const hasUptime = status?.uptime_kuma_enabled ?? false;
  const hasInfoRow = hasAnnouncements || hasFaq || hasUptime;

  return (
    <div className="flex w-full flex-1 flex-col gap-0 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("SIDEBAR.DASHBOARD")}
            </span>
          </div>
          <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
            {greeting}{greeting && ","} {displayName}
          </h1>
        </div>
        <div className="text-muted-foreground hidden items-center gap-1.5 md:flex">
          <LuActivity className="h-3 w-3" />
          <span className="font-mono text-[10px] tracking-widest uppercase">
            {dateStr}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="border-border mb-6 overflow-hidden border">
        <StatsCards />
      </div>

      {/* Charts + API Info */}
      <div
        className={`mb-6 grid gap-6 ${hasApiInfo ? "lg:grid-cols-[1fr_320px]" : ""}`}
      >
        <ConsumptionChart />
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
