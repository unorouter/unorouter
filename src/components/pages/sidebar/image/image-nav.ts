"use client";

import { useParams } from "next/navigation";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";

export type GenerateTab = "text2img" | "img2img" | "edit";
export type Img2ImgSubPill = "img2img" | "inpaint";

const IMAGE_TAB_VALUES = [
  "text2img",
  "img2img",
  "edit",
] as const satisfies readonly GenerateTab[];

const IMAGE_SUB_PILL_VALUES = [
  "img2img",
  "inpaint",
] as const satisfies readonly Img2ImgSubPill[];

export const IMAGE_URL_PARSERS = {
  snap: parseAsString.withOptions({ history: "push", clearOnDefault: true }),
  tab: parseAsStringLiteral(IMAGE_TAB_VALUES)
    .withDefault("text2img")
    .withOptions({ history: "replace", clearOnDefault: true }),
  mode: parseAsStringLiteral(IMAGE_SUB_PILL_VALUES)
    .withDefault("img2img")
    .withOptions({ history: "replace", clearOnDefault: true }),
};

export function useImageNav() {
  const params = useParams<{ id?: string }>();
  const [urlState, setUrlState] = useQueryStates(IMAGE_URL_PARSERS);

  return {
    sessionId: params.id ?? null,
    snapshotId: urlState.snap,
    tab: urlState.tab,
    subPill: urlState.mode,
    showSnapshot: (snap: string) => void setUrlState({ snap }),
    replaceSnapshot: (snap: string) =>
      void setUrlState({ snap }, { history: "replace" }),
    setTab: (tab: GenerateTab) =>
      void setUrlState({ tab, mode: tab === "img2img" ? undefined : null }),
    setSubPill: (mode: Img2ImgSubPill) => void setUrlState({ mode }),
    setNav: (next: { tab: GenerateTab; subPill?: Img2ImgSubPill }) =>
      void setUrlState({ tab: next.tab, mode: next.subPill ?? null }),
  };
}
