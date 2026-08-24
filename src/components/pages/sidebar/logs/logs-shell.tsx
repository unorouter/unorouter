"use client";

import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { UsageLogs } from "./common/usage-logs";
import { DrawingLogs } from "./drawing/drawing-logs";
import { TaskLogs } from "./task/task-logs";
import { upper } from "@/lib/utils/base";

const TABS = [
  { value: "common", Component: UsageLogs },
  { value: "drawing", Component: DrawingLogs },
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
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("LOGS.TITLE")}
          </span>
        </div>
        <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
          {t("LOGS.TITLE")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("LOGS.DESCRIPTION")}
        </p>
      </div>

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
