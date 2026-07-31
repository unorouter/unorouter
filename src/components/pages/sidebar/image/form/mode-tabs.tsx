"use client";

import { useTranslations } from "next-intl";
import { useAtom } from "jotai";
import { useQueryStates } from "nuqs";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { activeTabAtom } from "@/store/image-store";
import type { GenerateTab } from "@/store/image-store";
import { IMAGE_URL_PARSERS } from "../image-url-state";

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
  const [, setUrlState] = useQueryStates(IMAGE_URL_PARSERS);

  const onChange = (next: string) => {
    const tab = next as GenerateTab;
    setActiveTab(tab);
    void setUrlState({ tab, mode: tab === "img2img" ? undefined : null });
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
