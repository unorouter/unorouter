"use client";

import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { UsageLogs } from "./common/usage-logs";
import { DrawingLogs } from "./drawing/drawing-logs";
import { TaskLogs } from "./task/task-logs";

const TABS = ["common", "drawing", "task"] as const;
type LogsTab = (typeof TABS)[number];

function isLogsTab(value: string | null): value is LogsTab {
  return value != null && (TABS as readonly string[]).includes(value);
}

export function LogsShell() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: LogsTab = isLogsTab(tabParam) ? tabParam : "common";

  function setTab(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "common") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
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
          <TabsTrigger value="common">{t("LOGS.TABS.COMMON")}</TabsTrigger>
          <TabsTrigger value="drawing">{t("LOGS.TABS.DRAWING")}</TabsTrigger>
          <TabsTrigger value="task">{t("LOGS.TABS.TASK")}</TabsTrigger>
        </TabsList>

        <TabsContent value="common">
          <UsageLogs />
        </TabsContent>
        <TabsContent value="drawing">
          <DrawingLogs />
        </TabsContent>
        <TabsContent value="task">
          <TaskLogs />
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}
