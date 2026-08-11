"use client";

import { useLocalUserId } from "@/hooks/auth/use-local-user-id";
import { ADETAILER_DEFAULTS } from "../fields/adetailer-section";
import { readLocalMedia } from "@/lib/db/client/data/media/media";
import type { SnapshotView } from "@/lib/types";
import { restoreSnapshotIntoFormAtom } from "@/store/image-store";
import { useSetAtom } from "jotai";
import type { ImageParams, ReferenceEntry } from "@/lib/validation/image";
import type { GenerateTab, Img2ImgSubPill } from "../image-nav";
import { useImageNav } from "../image-nav";

export type QuickTarget = {
  tab: GenerateTab;
  subPill?: Img2ImgSubPill;
  hires?: boolean;
  adetailer?: boolean;
  remix?: boolean;
};

// One builder for every explicit restore (quick actions, reuse-seed): browsing history
// never auto-restores the form.
export function useSnapshotRestoreActions(data: SnapshotView | undefined) {
  const nav = useImageNav();
  const userId = useLocalUserId();
  const setRestore = useSetAtom(restoreSnapshotIntoFormAtom);

  // The gallery src is a blob: URL, which dies with the document: persisted into the
  // form draft it comes back dead after a reload and the inpaint canvas mounts on an
  // unloadable image. Resolve the media row's bytes into a durable data: URI instead.
  const durableInitUrl = async (src: string): Promise<string | undefined> => {
    const image = data?.images.find((i) => i.src === src);
    if (!image) return src;
    const row = await readLocalMedia(userId, image.id);
    if (!row?.dataBase64) return src;
    return `data:${row.mimeType};base64,${row.dataBase64}`;
  };

  const restore = (extra: {
    tab?: GenerateTab;
    subPill?: Img2ImgSubPill;
    initImageUrl?: string;
    references?: ReferenceEntry[];
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
      references: extra.references ?? data.references,
      extraParams: data.extraParams,
      tab: extra.tab,
      subPill: extra.subPill,
      initImageUrl: extra.initImageUrl,
      paramOverrides: extra.paramOverrides,
    });
  };

  // Each quick action pre-fills the one thing it promises. Remix must not carry an
  // init image (that would turn it into img2img of the old result); its seed comes
  // from the clicked image, each batch result has its own.
  const quickOverrides = (
    target: QuickTarget,
    remixSeed: number | null | undefined,
  ): Partial<ImageParams> | undefined => {
    if (target.remix) {
      return typeof remixSeed === "number" ? { seed: remixSeed } : undefined;
    }
    if (target.hires) return { hiresDenoise: 0.5, hiresUpscale: 1.5 };
    if (target.adetailer) return { adetailer: { ...ADETAILER_DEFAULTS } };
    return undefined;
  };

  const onQuickAction = async (src: string, target: QuickTarget) => {
    if (!data) return;
    nav.setNav({ tab: target.tab, subPill: target.subPill });
    const remixSeed = data.images.find((i) => i.src === src)?.seed;
    const durable = target.remix ? undefined : await durableInitUrl(src);
    // Edit models take their input as a reference image, and reusing the seed
    // would regenerate the original instead of editing it.
    const editing = target.tab === "edit";
    restore({
      tab: target.tab,
      subPill: target.subPill,
      initImageUrl: editing ? undefined : durable,
      references: editing && durable ? [{ url: durable }] : undefined,
      paramOverrides: editing
        ? { seed: undefined }
        : quickOverrides(target, remixSeed),
    });
  };

  const onReuseSeed = (seed: number) => {
    if (!data) return;
    // A seed is only useful with the rest of the generation reproduced around it.
    restore({ params: { ...data.params, seed } });
  };

  return { onQuickAction, onReuseSeed };
}
