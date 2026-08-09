"use client";

import type { SnapshotView } from "@/lib/types";
import { restoreSnapshotIntoFormAtom } from "@/store/image-store";
import { useSetAtom } from "jotai";
import type { ImageParams } from "@/lib/validation/image";
import type { GenerateTab, Img2ImgSubPill } from "../image-nav";
import { useImageNav } from "../image-nav";

export type QuickTarget = {
  tab: GenerateTab;
  subPill?: Img2ImgSubPill;
  hires?: boolean;
  remix?: boolean;
};

// One builder for every explicit restore (quick actions, reuse-seed): browsing history
// never auto-restores the form.
export function useSnapshotRestoreActions(data: SnapshotView | undefined) {
  const nav = useImageNav();
  const setRestore = useSetAtom(restoreSnapshotIntoFormAtom);

  const restore = (extra: {
    tab?: GenerateTab;
    subPill?: Img2ImgSubPill;
    initImageUrl?: string;
    paramOverrides?: Partial<ImageParams>;
    params?: ImageParams | null;
  }) => {
    if (!data) return;
    setRestore({
      model: data.model,
      prompt: data.prompt,
      negativePrompt: data.negativePrompt,
      params: extra.params !== undefined ? extra.params : data.params,
      loras: data.loras,
      references: data.references,
      extraParams: data.extraParams,
      tab: extra.tab,
      subPill: extra.subPill,
      initImageUrl: extra.initImageUrl,
      paramOverrides: extra.paramOverrides,
    });
  };

  const onQuickAction = (src: string, target: QuickTarget) => {
    if (!data) return;
    nav.setNav({ tab: target.tab, subPill: target.subPill });
    // Remix must not carry an init image (that would turn it into img2img of the old
    // result); the seed comes from the clicked image, each batch result has its own.
    const remixSeed = data.images.find((i) => i.src === src)?.seed;
    restore({
      tab: target.tab,
      subPill: target.subPill,
      initImageUrl: target.remix ? undefined : src,
      paramOverrides: target.remix
        ? typeof remixSeed === "number"
          ? { seed: remixSeed }
          : undefined
        : target.hires
          ? { hiresDenoise: 0.5, hiresUpscale: 1.5 }
          : undefined,
    });
  };

  const onReuseSeed = (seed: number) => {
    if (!data) return;
    // A seed is only useful with the rest of the generation reproduced around it.
    restore({ params: { ...data.params, seed } });
  };

  return { onQuickAction, onReuseSeed };
}
