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

/**
 * Keeps the selected model legal: guests only run free models, and a model that does not
 * belong to the active tab swaps for one that does. An UNKNOWN model is never swapped:
 * it is a hand-resolved passthrough checkpoint or a not-yet-loaded catalog entry, and
 * replacing it would spend the generation on a model the user did not choose.
 */
export function useModelTabFit(args: Args) {
  const form = args.form;
  const effectiveModels = args.effectiveModels;
  const changeModel = args.changeModel;

  useEffect(() => {
    if (effectiveModels.length === 0 || args.isLoggedIn) return;
    const current = form.getValues("model") ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    if (desc?.isFree) return;
    const freePool = effectiveModels.filter((m) => m.isFree);
    if (freePool.length > 0) changeModel(freePool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- changeModel is recreated per render; keying on login/model-list is the intent
  }, [args.isLoggedIn, effectiveModels]);

  useEffect(() => {
    if (effectiveModels.length === 0) return;
    // Must not fire before the draft restore (see useDraftPersistence).
    if (args.draftRestoredTab === null && !args.remixId) return;
    const current = form.getValues("model") ?? "";
    const desc = effectiveModels.find((m) => m.id === current);
    if (!desc || isModelInTab(desc, args.tab)) return;
    const pool = effectiveModels.filter((m) => isModelInTab(m, args.tab));
    if (pool.length > 0) changeModel(pool[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- changeModel is recreated per render; keying on tab/list/restore-state is the intent
  }, [args.tab, effectiveModels, args.draftRestoredTab, args.remixId]);
}
