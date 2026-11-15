"use client";

import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues } from "@/lib/validation/image";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";

type Args = {
  form: UseFormReturn<ImageFormValues>;
  effectiveModels: ImageModelDescriptor[];
  changeModel: (id: string) => void;
  isLoggedIn: boolean;
};

export function useModelTabFit(args: Args) {
  const form = args.form;
  const effectiveModels = args.effectiveModels;
  const changeModel = args.changeModel;

  useEffect(() => {
    if (effectiveModels.length === 0 || args.isLoggedIn) return;
    const current = form.getValues("model") ?? "";
    const desc = effectiveModels.find((m) => m.model_name === current);
    if (desc?.is_free) return;
    const freePool = effectiveModels.filter((m) => m.is_free);
    if (freePool.length > 0) changeModel(freePool[0].model_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- changeModel is recreated per render; keying on login/model-list is the intent
  }, [args.isLoggedIn, effectiveModels]);
}
