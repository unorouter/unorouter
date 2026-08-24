"use client";

import { defaultParams, imageParams } from "@/lib/ai/image/models";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues, ImageModelId } from "@/lib/validation/image";
import { useSnapshotQuery } from "@/hooks/ai/image-hook";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import { defaultsFor } from "../logic/persistence";

type Args = {
  form: UseFormReturn<ImageFormValues>;
  findDescriptor: (id: ImageModelId) => ImageModelDescriptor;
};

export function useRemixSeed(args: Args): { remixId: string | null } {
  const form = args.form;
  const findDescriptor = args.findDescriptor;
  const searchParams = useSearchParams();
  const router = useRouter();

  const remixId = searchParams.get("remix");
  const hiresShortcut = searchParams.get("hires") === "1";
  const inpaintShortcut = searchParams.get("inpaint") === "1";
  const seedQuery = useSnapshotQuery(remixId);

  const seededIdRef = useRef<string | null>(null);
  useEffect(() => {
    const data = seedQuery.data;
    if (!data || seededIdRef.current === data.id) return;
    seededIdRef.current = data.id;
    const desc = findDescriptor(data.model);
    const seedSource = data.images?.[0]?.src;
    const inpaintParams =
      inpaintShortcut && seedSource
        ? { initImageUrl: seedSource, strength: 0.85 }
        : {};
    const hiresParams =
      hiresShortcut && imageParams(desc).supportsHiresFix && seedSource
        ? {
            hiresDenoise: 0.5,
            hiresUpscale: 1.5,
            initImageUrl: seedSource,
          }
        : {};
    form.reset({
      ...defaultsFor(desc),
      prompt: data.prompt,
      negativePrompt: data.negativePrompt ?? "",
      params: {
        ...defaultParams(desc),
        ...(data.params ?? {}),
        ...hiresParams,
        ...inpaintParams,
      },
      loras: data.loras ?? undefined,
      references: data.references ?? undefined,
      visibility: "private",
      ui: { variants: 1 },
    });
    const url = new URL(window.location.href);
    for (const key of ["remix", "hires", "inpaint"]) {
      url.searchParams.delete(key);
    }
    if (Object.keys(inpaintParams).length > 0) {
      url.searchParams.set("tab", "img2img");
      url.searchParams.set("mode", "inpaint");
    } else if (Object.keys(hiresParams).length > 0) {
      url.searchParams.set("tab", "img2img");
    }
    router.replace(url.pathname + url.search, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seededIdRef makes this idempotent; only new snapshot data may re-run it
  }, [seedQuery.data, form]);

  return { remixId };
}
