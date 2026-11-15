"use client";

import { SidebarPageHeader } from "@/components/elements/content/sidebar-page-header";
import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { UsageLogs } from "./common/usage-logs";
import { TaskLogs } from "./task/task-logs";
import { upper } from "@/lib/utils/base";

const TABS = [
  { value: "common", Component: UsageLogs },
  { value: "task", Component: TaskLogs },
] as const;
const TAB_VALUES = TABS.map((tab) => tab.value);

export function LogsShell() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TAB_VALUES).withDefault("common"),
  );

  function setTab(next: string) {
    setActiveTab(TAB_VALUES.find((tab) => tab === next) ?? "common");
  }

  return (
    <PageContent>
      <SidebarPageHeader
        className="mb-6"
        eyebrow={t("LOGS.TITLE")}
        title={t("LOGS.TITLE")}
        description={t("LOGS.DESCRIPTION")}
      />

      <Tabs value={activeTab} onValueChange={setTab} className="gap-4">
        <TabsList variant="line">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {t(`LOGS.TABS.${upper(tab.value)}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <tab.Component />
          </TabsContent>
        ))}
      </Tabs>
    </PageContent>
  );
}
