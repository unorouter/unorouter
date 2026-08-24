"use client";

import { useRememberImageModelMutation } from "@/hooks/ai/image-catalog-hook";
import { useSubmitGenerationMutation } from "@/hooks/ai/image-hook";
import type { ImageFormValues } from "@/lib/validation/image";
import { useRouter } from "@/i18n/navigation";
import type { UseFormReturn } from "react-hook-form";
import { useImageNav } from "../../image-nav";
import { INITIAL_MODEL } from "../../image-constants";
import { deriveMode } from "../logic/mode";
import type { CustomCheckpoint } from "../sections/model-picker";
import { toSubmitBody } from "../logic/submit-transform";

type Args = {
  form: UseFormReturn<ImageFormValues>;
  activeCheckpoint: CustomCheckpoint | null;
  setSamplerMemory: (params: ImageFormValues["params"], model: string) => void;
  setDraft: (values: ImageFormValues) => void;
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
              airName: activeCheckpoint.name,
              ...(activeCheckpoint.architecture
                ? { airArchitecture: activeCheckpoint.architecture }
                : {}),
              ...(body.extraParams ?? {}),
            },
          }
        : {}),
      sessionId: nav.sessionId ?? undefined,
    });

    if (activeCheckpoint) rememberModel.mutate(activeCheckpoint);

    if (mode === "inpaint") {
      form.setValue("ui.inpaintMaskDataUrl", undefined);
    }

    args.setSamplerMemory(data.params ?? {}, data.model ?? INITIAL_MODEL);
    args.setDraft(data);

    // nuqs owns snap: a router navigation changing only the query desyncs it silently.
    if (nav.sessionId === submitted.sessionId) {
      nav.replaceSnapshot(submitted.snapshotId);
    } else {
      router.replace(
        {
          pathname: "/image/[id]",
          params: { id: submitted.sessionId },
          query: { snap: submitted.snapshotId },
        },
        { scroll: false },
      );
    }
  });

  return { onSubmit, isPending: submitMut.isPending };
}
