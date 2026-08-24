"use client";

import { getModelDescriptor } from "@/lib/ai/image/models";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues } from "@/lib/validation/image";
import { useAtom } from "jotai";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { GenerateTab } from "../../image-nav";
import { INITIAL_MODEL } from "../../image-constants";
import { isModelInTab } from "../logic/mode";
import {
  defaultsFor,
  draftAtomFor,
  draftFromForm,
  formValuesFromDraft,
} from "../logic/persistence";

const DRAFT_SAVE_DEBOUNCE_MS = 500;

type Args = {
  form: UseFormReturn<ImageFormValues>;
  tab: GenerateTab;
  remixId: string | null;
  effectiveModels: ImageModelDescriptor[];
};

export function useDraftPersistence(args: Args) {
  const form = args.form;
  const [draft, setDraft] = useAtom(draftAtomFor(args.tab));

  // Not a ref: the tab-fit effect must re-render when the restore lands.
  const [draftRestoredTab, setDraftRestoredTab] = useState<string | null>(null);

  useEffect(() => {
    if (draftRestoredTab === args.tab || args.remixId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the gate flag must land in the same pass as the form.reset below; the tab-fit hook keys on it
    setDraftRestoredTab(args.tab);
    if (!draft) {
      const fallback =
        args.effectiveModels.find((m) => isModelInTab(m, args.tab)) ??
        getModelDescriptor(INITIAL_MODEL);
      form.reset(defaultsFor(fallback));
      return;
    }
    form.reset(
      formValuesFromDraft(
        draft,
        getModelDescriptor(draft.model || INITIAL_MODEL),
      ),
    );
  }, [
    args.tab,
    args.remixId,
    draft,
    form,
    draftRestoredTab,
    args.effectiveModels,
  ]);

  // RHF ignores a cleanup returned from inside watch(), so the timer lives out here.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = form.watch(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setDraft(draftFromForm(form.getValues()));
      }, DRAFT_SAVE_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [form, setDraft]);

  return { setDraft, draftRestoredTab, setDraftRestoredTab };
}
