"use client";

import { useRememberImageModelMutation } from "@/hooks/ai/image-catalog-hook";
import { useSubmitGenerationMutation } from "@/hooks/ai/image-hook";
import type { GenerationFormValues } from "@/lib/validation/playground";
import { useRouter } from "@/i18n/navigation";
import type { UseFormReturn } from "react-hook-form";
import { useImageNav } from "../image-nav";
import { INITIAL_MODEL } from "../image-constants";
import { deriveMode } from "./mode";
import type { CustomCheckpoint } from "./model-picker";
import { toSubmitBody } from "./submit-transform";

type Args = {
  form: UseFormReturn<GenerationFormValues>;
  activeCheckpoint: CustomCheckpoint | null;
  setSamplerMemory: (
    params: GenerationFormValues["params"],
    model: string,
  ) => void;
  setDraft: (values: GenerationFormValues) => void;
};

export function useSubmitGeneration(args: Args) {
  const form = args.form;
  const nav = useImageNav();
  const router = useRouter();
  const rememberModel = useRememberImageModelMutation();
  const submitMut = useSubmitGenerationMutation();

  const onSubmit = form.handleSubmit(async (data) => {
    const activeCheckpoint = args.activeCheckpoint;
    const mode = deriveMode(nav.tab, nav.subPill);
    const body = await toSubmitBody(data, {
      activeSessionId: nav.sessionId,
      mode,
    });
    const submitted = await submitMut.mutateAsync({
      ...body,
      ...(activeCheckpoint
        ? {
            extraParams: {
              air: activeCheckpoint.air,
              // Name persisted so history shows the checkpoint, not the routing id.
              airName: activeCheckpoint.name,
              ...(activeCheckpoint.architecture
                ? { airArchitecture: activeCheckpoint.architecture }
                : {}),
              // A per-request inpaint override beats the form's checkpoint.
              ...(body.extraParams ?? {}),
            },
          }
        : {}),
      sessionId: nav.sessionId ?? undefined,
    });

    // Saved only once it has produced an image, so the list is checkpoints actually used.
    if (activeCheckpoint) rememberModel.mutate(activeCheckpoint);

    if (mode === "inpaint") {
      form.setValue("ui.inpaintMaskDataUrl", undefined);
    }

    args.setSamplerMemory(data.params ?? {}, data.model ?? INITIAL_MODEL);
    // The draft is the whole setup and survives the submit; the checkpoint is already
    // in data.ui, so nothing needs merging back.
    args.setDraft(data);

    // replace: a submit must not add a back entry between the form and its own result.
    router.replace(
      {
        pathname: "/image/[id]",
        params: { id: submitted.sessionId },
        query: { snap: submitted.snapshotId },
      },
      { scroll: false },
    );
  });

  return { onSubmit, isPending: submitMut.isPending };
}
