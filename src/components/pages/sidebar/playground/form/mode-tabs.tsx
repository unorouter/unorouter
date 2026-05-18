"use client";

import { useTranslations } from "next-intl";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activeTabAtom } from "@/store/playground-store";
import type { GenerateTab } from "@/store/playground-store";

const TABS: ReadonlyArray<{
  id: GenerateTab;
  i18nKey: string;
  iconName: IconName;
}> = [
  { id: "text2img", i18nKey: "IMAGE.TAB_TEXT2IMG", iconName: "image" },
  { id: "img2img", i18nKey: "IMAGE.TAB_IMG2IMG", iconName: "paintbrush" },
  { id: "edit", i18nKey: "IMAGE.TAB_EDIT", iconName: "pencil" },
];

export function ModeTabs() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useAtom(activeTabAtom);
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") as GenerateTab | null;

  // URL is source of truth on mount; click handler rewrites URL after.
  useEffect(() => {
    if (
      urlTab &&
      (urlTab === "text2img" || urlTab === "img2img" || urlTab === "edit")
    ) {
      setActiveTab(urlTab);
    }
  }, [urlTab, setActiveTab]);

  const onChange = (next: string) => {
    const tab = next as GenerateTab;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    // Sub-pill is img2img-only; drop stale state when leaving the tab.
    if (tab !== "img2img") url.searchParams.delete("mode");
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <Tabs value={activeTab} onValueChange={onChange}>
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            <Icon name={tab.iconName} className="mr-1.5 h-4 w-4" />
            {t(tab.i18nKey as Parameters<typeof t>[0])}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
