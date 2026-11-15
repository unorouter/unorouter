"use client";

import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues } from "@/lib/validation/image";
import { useEffect, useEffectEvent } from "react";
import type { UseFormReturn } from "react-hook-form";

type Args = {
  form: UseFormReturn<ImageFormValues>;
  effectiveModels: ImageModelDescriptor[];
  changeModel: (id: string) => void;
  isLoggedIn: boolean;
};

export function useModelTabFit(args: Args) {
  const effectiveModels = args.effectiveModels;
  const fitFree = useEffectEvent(() => {
    if (effectiveModels.length === 0 || args.isLoggedIn) return;
    const current = args.form.getValues("model") ?? "";
    const desc = effectiveModels.find((m) => m.model_name === current);
    if (desc?.is_free) return;
    const free = effectiveModels.find((m) => m.is_free);
    if (free) args.changeModel(free.model_name);
  });
  useEffect(() => fitFree(), [args.isLoggedIn, effectiveModels]);
}
