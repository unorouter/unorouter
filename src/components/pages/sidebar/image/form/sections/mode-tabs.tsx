"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TranslationKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  useImageNav,
  type GenerateTab,
  type Img2ImgSubPill,
} from "../../image-nav";

const TABS: ReadonlyArray<{
  id: GenerateTab;
  i18nKey: TranslationKey;
  iconName: IconName;
}> = [
  { id: "text2img", i18nKey: "IMAGE.TAB_TEXT2IMG", iconName: "image" },
  { id: "img2img", i18nKey: "IMAGE.TAB_IMG2IMG", iconName: "paintbrush" },
  { id: "edit", i18nKey: "IMAGE.TAB_EDIT", iconName: "pencil" },
];

const PILLS: ReadonlyArray<{
  id: Img2ImgSubPill;
  i18nKey: TranslationKey;
  iconName: IconName;
}> = [
  { id: "img2img", i18nKey: "IMAGE.SUB_IMG2IMG", iconName: "image" },
  { id: "inpaint", i18nKey: "IMAGE.SUB_INPAINT", iconName: "paintbrush" },
];

export function ModeTabs() {
  const t = useTranslations();
  const nav = useImageNav();

  return (
    <Tabs
      value={nav.tab}
      onValueChange={(next) => {
        const tab = TABS.find((t) => t.id === next);
        if (tab) nav.setTab(tab.id);
      }}
    >
      <TabsList>
        {TABS.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            <Icon name={tab.iconName} className="mr-1.5 h-4 w-4" />
            {t(tab.i18nKey)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function Img2ImgSubPills() {
  const t = useTranslations();
  const nav = useImageNav();

  return (
    <div className="flex flex-wrap gap-2">
      {PILLS.map((p) => (
        <Button
          key={p.id}
          type="button"
          variant={nav.subPill === p.id ? "default" : "outline"}
          size="sm"
          onClick={() => nav.setSubPill(p.id)}
          className={cn("gap-1.5")}
        >
          <Icon name={p.iconName} className="h-4 w-4" />
          {t(p.i18nKey)}
        </Button>
      ))}
    </div>
  );
}
