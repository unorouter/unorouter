import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import type { ImageFormValues } from "@/lib/validation/image";
import {
  editDraftAtom,
  img2imgDraftAtom,
  text2imgDraftAtom,
  type GenerateDraft,
} from "@/store/image-store";
import type { GenerateTab } from "../../image-nav";
import { INITIAL_MODEL } from "../../image-constants";

export function defaultsFor(d: ImageModelDescriptor): ImageFormValues {
  return {
    model: d.model_name,
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

export function draftFromForm(v: ImageFormValues): GenerateDraft {
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

// blob: URLs die with the document that made them; one restored from a draft after a
// reload is guaranteed dead, and the inpaint canvas mounting on an unloadable image
// bricks the whole img2img section. Drop them, keep everything durable.
function stripDeadBlobUrls(
  params: GenerateDraft["params"],
): GenerateDraft["params"] {
  const out = { ...params };
  for (const key of ["initImageUrl", "maskUrl"] as const) {
    if (typeof out[key] === "string" && out[key].startsWith("blob:")) {
      delete out[key];
    }
  }
  return out;
}

export function formValuesFromDraft(
  draft: GenerateDraft,
  desc: ImageModelDescriptor,
): ImageFormValues {
  return {
    ...defaultsFor(desc),
    model: draft.model,
    prompt: draft.prompt,
    negativePrompt: draft.negativePrompt ?? "",
    params: stripDeadBlobUrls(draft.params),
    loras: draft.loras,
    references: draft.references,
    ui: draft.extraParams ?? { variants: 1 },
  };
}
