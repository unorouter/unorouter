"use client";

import { SidebarPageHeader } from "@/components/elements/content/sidebar-page-header";
import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserDisplay } from "@/hooks/ui/user-display-hook";
import type { TimeRange } from "@/store/dashboard-store";
import { dashboardStoreAtom } from "@/store/dashboard-store";
import { dayjs } from "@/lib/utils/format/date";
import { useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useRef } from "react";
import { AnalyticsSection } from "./analytics-section";
import { FlowSection } from "./flow-section";
import { OverviewSection } from "./overview-section";
import { upper } from "@/lib/utils/base";

type DashboardProps = {
  serverTimestamps: TimeRange;
};

const SECTIONS = [
  { value: "analytics", Component: AnalyticsSection },
  { value: "overview", Component: OverviewSection },
  { value: "flow", Component: FlowSection },
] as const;
const SECTION_VALUES = SECTIONS.map((section) => section.value);

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
        <SidebarPageHeader
          eyebrow={t("SIDEBAR.DASHBOARD")}
          title={`${greeting}, ${displayName}`}
        />
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
              {t(`DASHBOARD.SECTION.${upper(section.value)}`)}
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
