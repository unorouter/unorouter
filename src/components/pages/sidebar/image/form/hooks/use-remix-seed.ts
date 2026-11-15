"use client";

import { useSnapshotQuery } from "@/hooks/ai/image-hook";
import { restoreSnapshotIntoFormAtom } from "@/store/image-store";
import { useSetAtom } from "jotai";
import { parseAsString, useQueryStates } from "nuqs";
import { useEffect, useRef } from "react";
import { IMAGE_URL_PARSERS } from "../../image-nav";

const REMIX_PARSERS = {
  tab: IMAGE_URL_PARSERS.tab,
  mode: IMAGE_URL_PARSERS.mode,
  remix: parseAsString,
  inpaint: parseAsString,
};

export function useRemixSeed(): { remixId: string | null } {
  const [url, setUrl] = useQueryStates(REMIX_PARSERS);
  const data = useSnapshotQuery(url.remix).data;
  const setRestore = useSetAtom(restoreSnapshotIntoFormAtom);

  const seededIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!data || seededIdRef.current === data.id) return;
    seededIdRef.current = data.id;
    const inpaintSource =
      url.inpaint === "1" ? data.images?.[0]?.src : undefined;
    setRestore({
      model: data.model,
      prompt: data.prompt,
      negativePrompt: data.negativePrompt,
      params: data.params,
      loras: data.loras,
      references: data.references,
      extraParams: null,
      initImageUrl: inpaintSource,
      paramOverrides: inpaintSource ? { strength: 0.85 } : undefined,
    });
    void setUrl(
      inpaintSource
        ? { remix: null, inpaint: null, tab: "img2img", mode: "inpaint" }
        : { remix: null, inpaint: null },
      { history: "replace" },
    );
  }, [data, url.inpaint, setRestore, setUrl]);

  return { remixId: url.remix };
}
