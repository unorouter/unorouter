"use client";

import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues } from "@/lib/validation/image";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { GenerateTab } from "../../image-nav";
import { isModelInTab } from "../logic/mode";

type Args = {
  form: UseFormReturn<ImageFormValues>;
  tab: GenerateTab;
  effectiveModels: ImageModelDescriptor[];
  changeModel: (id: string) => void;
  isLoggedIn: boolean;
  remixId: string | null;
  draftRestoredTab: string | null;
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

  useEffect(() => {
    if (effectiveModels.length === 0) return;
    if (args.draftRestoredTab === null && !args.remixId) return;
    const current = form.getValues("model") ?? "";
    const desc = effectiveModels.find((m) => m.model_name === current);
    if (!desc || isModelInTab(desc, args.tab)) return;
    const pool = effectiveModels.filter((m) => isModelInTab(m, args.tab));
    if (pool.length > 0) changeModel(pool[0].model_name);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- changeModel is recreated per render; keying on tab/list/restore-state is the intent
  }, [args.tab, effectiveModels, args.draftRestoredTab, args.remixId]);
}
