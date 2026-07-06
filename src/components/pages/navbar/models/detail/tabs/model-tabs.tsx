"use client";

import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

type TabValue = "overview" | "api" | "benchmarks";

const TAB_VALUES: TabValue[] = ["overview", "api", "benchmarks"];
const parseTab = (raw: string | null): TabValue =>
  TAB_VALUES.find((tab) => tab === raw) ?? "overview";

interface ModelTabsProps {
  overview: ReactNode;
  api: ReactNode;
  benchmarks: ReactNode;
}

export function ModelTabs(props: ModelTabsProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const active = parseTab(searchParams.get("tab"));

  function onValueChange(value: string) {
    const next = parseTab(value);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "overview") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
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
