"use client";

import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues, ImageModelId } from "@/lib/validation/image";
import { restoreSnapshotIntoFormAtom } from "@/store/image-store";
import { useAtom } from "jotai";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { defaultsFor } from "../logic/persistence";

type Args = {
  form: UseFormReturn<ImageFormValues>;
  findDescriptor: (id: ImageModelId) => ImageModelDescriptor;
};

// Consumes the one-shot restore mailbox (remix button, reuse-seed, quick actions).
export function useSnapshotRestore(args: Args) {
  const form = args.form;
  const [restorePayload, setRestorePayload] = useAtom(
    restoreSnapshotIntoFormAtom,
  );

  useEffect(() => {
    if (!restorePayload) return;
    const desc = args.findDescriptor(restorePayload.model);
    const mergedParams: Record<string, unknown> = {
      ...desc.defaultParams,
      ...(restorePayload.params ?? {}),
    };
    if (restorePayload.initImageUrl) {
      mergedParams.initImageUrl = restorePayload.initImageUrl;
    }
    Object.assign(mergedParams, restorePayload.paramOverrides ?? {});
    form.reset({
      ...defaultsFor(desc),
      model: desc.id,
      prompt: restorePayload.prompt,
      negativePrompt: restorePayload.negativePrompt ?? "",
      params: mergedParams as ImageFormValues["params"],
      loras: restorePayload.loras ?? undefined,
      references: restorePayload.references ?? undefined,
      ui: restorePayload.extraParams ?? { variants: 1 },
    });
    setRestorePayload(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot mailbox: cleared above, so only a new payload re-runs it
  }, [restorePayload]);
}
