"use client";

import { useTranslations } from "next-intl";
import { useAtom } from "jotai";
import { useQueryStates } from "nuqs";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import { cn } from "@/lib/utils";
import { activeSubPillAtom } from "@/store/image-store";
import type { Img2ImgSubPill } from "@/store/image-store";
import { IMAGE_URL_PARSERS } from "../image-url-state";

const PILLS: ReadonlyArray<{
  id: Img2ImgSubPill;
  i18nKey: string;
  iconName: IconName;
}> = [
  { id: "img2img", i18nKey: "IMAGE.SUB_IMG2IMG", iconName: "image" },
  { id: "upscale", i18nKey: "IMAGE.SUB_UPSCALE", iconName: "maximize-2" },
  { id: "adetailer", i18nKey: "IMAGE.SUB_ADETAILER", iconName: "pencil-ruler" },
  { id: "inpaint", i18nKey: "IMAGE.SUB_INPAINT", iconName: "paintbrush" },
];

export function Img2ImgSubPills() {
  const t = useTranslations();
  const [active, setActive] = useAtom(activeSubPillAtom);
  const [, setUrlState] = useQueryStates(IMAGE_URL_PARSERS);

  const onPick = (next: Img2ImgSubPill) => {
    setActive(next);
    void setUrlState({ mode: next });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PILLS.map((p) => (
        <Button
          key={p.id}
          type="button"
          variant={active === p.id ? "default" : "outline"}
          size="sm"
          onClick={() => onPick(p.id)}
          className={cn("gap-1.5")}
        >
          <Icon name={p.iconName} className="h-4 w-4" />
          {t(p.i18nKey as Parameters<typeof t>[0])}
        </Button>
      ))}
    </div>
  );
}
