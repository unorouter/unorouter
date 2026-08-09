import type { PlaygroundModelDescriptor } from "@/lib/ai/playground/models";
import type { GenerationFormValues } from "@/lib/validation/playground";
import {
  editDraftAtom,
  img2imgDraftAtom,
  text2imgDraftAtom,
  type GenerateDraft,
} from "@/store/image-store";
import type { GenerateTab } from "../image-nav";
import { INITIAL_MODEL } from "../image-constants";

export function defaultsFor(
  d: PlaygroundModelDescriptor,
): GenerationFormValues {
  return {
    model: d.id,
    prompt: "",
    negativePrompt: "",
    params: { ...d.defaultParams },
    visibility: "private",
    ui: { variants: 1 },
  };
}

export function draftAtomFor(tab: GenerateTab) {
  if (tab === "img2img") return img2imgDraftAtom;
  if (tab === "edit") return editDraftAtom;
  return text2imgDraftAtom;
}

export function draftFromForm(v: GenerationFormValues): GenerateDraft {
  return {
    model: v.model ?? INITIAL_MODEL,
    prompt: v.prompt ?? "",
    negativePrompt: v.negativePrompt ?? "",
    params: v.params ?? {},
    loras: v.loras,
    references: v.references,
    extraParams: v.ui ?? { variants: 1 },
  };
}

export function formValuesFromDraft(
  draft: GenerateDraft,
  desc: PlaygroundModelDescriptor,
): GenerationFormValues {
  return {
    ...defaultsFor(desc),
    model: draft.model,
    prompt: draft.prompt,
    negativePrompt: draft.negativePrompt ?? "",
    params: draft.params,
    loras: draft.loras,
    references: draft.references,
    ui: draft.extraParams ?? { variants: 1 },
  };
}
