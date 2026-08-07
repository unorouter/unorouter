"use client";

import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import { analytics } from "@/lib/analytics";
import type { DashboardStore } from "@/store/dashboard-store";
import { dashboardStoreAtom } from "@/store/dashboard-store";
import { dayjs } from "@/lib/utils/format/date";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useRef } from "react";
import { AnalyticsSection } from "./analytics-section";
import { FlowSection } from "./flow-section";
import { OverviewSection } from "./overview-section";

type DashboardProps = {
  serverTimestamps: DashboardStore;
};

const SECTIONS = [
  { value: "analytics", Component: AnalyticsSection },
  { value: "overview", Component: OverviewSection },
  { value: "flow", Component: FlowSection },
] as const;
const SECTION_VALUES = SECTIONS.map((section) => section.value);
type DashboardSection = (typeof SECTIONS)[number]["value"];

export function Dashboard(props: DashboardProps) {
  const setDashboardStore = useSetAtom(dashboardStoreAtom);
  const hydrated = useRef<boolean | null>(null);
  if (hydrated.current == null) {
    hydrated.current = true;
    setDashboardStore(props.serverTimestamps);
  }
  const t = useTranslations();
  const { displayName } = useUserDisplay();
  const [activeSection, setActiveSection] = useQueryState(
    "section",
    parseAsStringLiteral(SECTION_VALUES).withDefault("analytics"),
  );

  function setSection(next: string) {
    const section =
      SECTION_VALUES.find((value) => value === next) ?? "analytics";
    analytics.dashboard.sectionChanged({ section });
    setActiveSection(section);
  }

  const hours = dayjs().hour();
  const greetingKey =
    hours >= 5 && hours < 12
      ? "DASHBOARD.GREETING.MORNING"
      : hours >= 12 && hours < 18
        ? "DASHBOARD.GREETING.AFTERNOON"
        : "DASHBOARD.GREETING.EVENING";
  const greeting = t(greetingKey);

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

      <Tabs value={activeSection} onValueChange={setSection} className="gap-6">
        <TabsList variant="line">
          {SECTIONS.map((section) => (
            <TabsTrigger
              key={section.value}
              value={section.value}
              className="font-mono text-xs"
            >
              {t(
                `DASHBOARD.SECTION.${section.value.toUpperCase() as Uppercase<DashboardSection>}`,
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map((section) => (
          <TabsContent key={section.value} value={section.value}>
            <section.Component />
          </TabsContent>
        ))}
      </Tabs>
    </PageContent>
  );
}
