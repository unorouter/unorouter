import { blobUrlToDataUri } from "@/lib/db/client/data/media/blob-url";
import { CUSTOM_CIVITAI_MODEL_ID, clampVariants } from "../image-constants";
import type {
  GenerationFormValues,
  GenerationMode,
  PlaygroundSubmitBody,
  SubmitExtraParams,
} from "@/lib/validation/playground";

export type SubmitContext = {
  activeSessionId: string | null;
  mode: GenerationMode;
};

export async function toSubmitBody(
  values: GenerationFormValues,
  ctx: SubmitContext,
): Promise<PlaygroundSubmitBody> {
  const ui = values.ui ?? {};
  const variants = clampVariants(ui.variants);

  const paramsWithN: Record<string, unknown> = {
    ...(values.params ?? {}),
    n: variants,
  };

  // A blob: URL means nothing outside this document; resolve to bytes before it leaves
  // the browser or the provider gets a dead reference.
  const initImageUrl = paramsWithN.initImageUrl;
  if (typeof initImageUrl === "string" && initImageUrl.startsWith("blob:")) {
    paramsWithN.initImageUrl = await blobUrlToDataUri(initImageUrl);
  }

  // The provider rejects a mask without its init image outright.
  const hasInitImage =
    typeof paramsWithN.initImageUrl === "string" && !!paramsWithN.initImageUrl;
  if (!hasInitImage) delete paramsWithN.maskUrl;

  if (ctx.mode === "inpaint" && ui.inpaintMaskDataUrl && hasInitImage) {
    paramsWithN.maskUrl = ui.inpaintMaskDataUrl;
    // Every inpaint field is an override; empty reuses what the form holds.
    if (ui.inpaintStrength !== undefined) {
      paramsWithN.strength = ui.inpaintStrength;
    }
    if (ui.inpaintNegativePrompt) {
      paramsWithN.negativePrompt = ui.inpaintNegativePrompt;
    }
  }

  // The inpaint checkpoint override applies to this request only.
  const wireExtras: SubmitExtraParams =
    ctx.mode === "inpaint" && ui.inpaintAir
      ? { air: ui.inpaintAir, airName: ui.inpaintAirName }
      : {};
  const cleanedExtras =
    Object.keys(wireExtras).length > 0 ? wireExtras : undefined;

  const loras =
    values.loras && values.loras.length > 0 ? values.loras : undefined;

  // An inpaint AIR override must also switch to the passthrough model id: the AIR is
  // what the provider loads, the catalog id is what routes there.
  const inpaintingWithModel =
    ctx.mode === "inpaint" && hasInitImage && !!ui.inpaintAir;

  return {
    model: inpaintingWithModel ? CUSTOM_CIVITAI_MODEL_ID : values.model,
    mode: ctx.mode,
    prompt:
      ctx.mode === "inpaint" && ui.inpaintPrompt
        ? ui.inpaintPrompt
        : values.prompt,
    negativePrompt: values.negativePrompt || undefined,
    params: paramsWithN as never,
    loras,
    references: values.references,
    extraParams: cleanedExtras,
    visibility: values.visibility,
    sessionId: ctx.activeSessionId ?? undefined,
  };
}
