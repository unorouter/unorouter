"use client";

import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { ReactNode } from "react";

const TAB_VALUES = ["overview", "api", "benchmarks"] as const;

interface ModelTabsProps {
  overview: ReactNode;
  api: ReactNode;
  benchmarks: ReactNode;
}

export function ModelTabs(props: ModelTabsProps) {
  const t = useTranslations();
  const [active, setActive] = useQueryState(
    "tab",
    parseAsStringLiteral(TAB_VALUES).withDefault("overview"),
  );

  function onValueChange(value: string) {
    setActive(TAB_VALUES.find((tab) => tab === value) ?? "overview");
  }

  return (
    <Tabs value={active} onValueChange={onValueChange} className="mt-6 gap-0">
      <TabsList variant="line">
        <TabsTrigger value="overview">
          <Icon name="layout-grid" className="h-4 w-4" />
          {t("MODEL_PAGE.OVERVIEW_TAB")}
        </TabsTrigger>
        <TabsTrigger value="api">
          <Icon name="code" className="h-4 w-4" />
          {t("MODEL_PAGE.API_TAB")}
        </TabsTrigger>
        <TabsTrigger value="benchmarks">
          <Icon name="chart-bar" className="h-4 w-4" />
          {t("MODEL_PAGE.BENCHMARKS_TAB")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="[&>section:first-child]:mt-6">
        {props.overview}
      </TabsContent>
      <TabsContent value="api" className="[&>section:first-child]:mt-6">
        {props.api}
      </TabsContent>
      <TabsContent value="benchmarks" className="[&>section:first-child]:mt-6">
        {props.benchmarks}
      </TabsContent>
    </Tabs>
  );
}
