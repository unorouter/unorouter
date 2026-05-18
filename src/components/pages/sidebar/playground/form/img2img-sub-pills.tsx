"use client";

// Sub-pill strip visible only when the Img2Img top tab is active. Four
// sub-modes: Img2Img / Upscale / ADetailer / Inpaint. Each swaps the
// form's settings panel and the outgoing submit's `params.mode`.
// URL-synced via ?mode=... so deep links restore the right sub-pill.

import { useTranslations } from "next-intl";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/config/icon-map";
import { cn } from "@/lib/utils";
import { activeSubPillAtom } from "@/store/playground-store";
import type { Img2ImgSubPill } from "@/store/playground-store";

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
  const searchParams = useSearchParams();
  const urlMode = searchParams.get("mode") as Img2ImgSubPill | null;

  useEffect(() => {
    if (
      urlMode === "img2img" ||
      urlMode === "upscale" ||
      urlMode === "adetailer" ||
      urlMode === "inpaint"
    ) {
      setActive(urlMode);
    }
  }, [urlMode, setActive]);

  const onPick = (next: Img2ImgSubPill) => {
    setActive(next);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", next);
    window.history.replaceState(null, "", url.toString());
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
