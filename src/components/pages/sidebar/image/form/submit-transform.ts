import { blobUrlToDataUri } from "@/lib/db/client/data/media/blob-url";
import { CUSTOM_CIVITAI_MODEL_ID, clampVariants } from "../image-constants";
import type {
  GenerationFormValues,
  GenerationMode,
  GenerationParams,
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
  const inpainting = ctx.mode === "inpaint";

  const params: GenerationParams = { ...(values.params ?? {}), n: variants };

  // A blob: URL means nothing outside this document; resolve to bytes before it leaves
  // the browser or the provider gets a dead reference.
  if (params.initImageUrl?.startsWith("blob:")) {
    params.initImageUrl = await blobUrlToDataUri(params.initImageUrl);
  }

  // The provider rejects a mask without its init image outright.
  const hasInitImage = !!params.initImageUrl;
  if (!hasInitImage) delete params.maskUrl;

  // Every inpaint field is an override; empty reuses what the form holds.
  const inpaintActive = inpainting && !!ui.inpaintMaskDataUrl && hasInitImage;
  if (inpaintActive) {
    params.maskUrl = ui.inpaintMaskDataUrl;
    if (ui.inpaintStrength !== undefined) {
      params.strength = ui.inpaintStrength;
    }
  }

  // The inpaint checkpoint override applies to this request only. It must also switch to
  // the passthrough model id: the AIR is what the provider loads, the catalog id is what
  // routes there.
  const inpaintingWithModel = inpainting && hasInitImage && !!ui.inpaintAir;
  const extraParams: SubmitExtraParams | undefined = inpaintingWithModel
    ? { air: ui.inpaintAir, airName: ui.inpaintAirName }
    : undefined;

  return {
    model: inpaintingWithModel ? CUSTOM_CIVITAI_MODEL_ID : values.model,
    mode: ctx.mode,
    prompt: inpainting && ui.inpaintPrompt ? ui.inpaintPrompt : values.prompt,
    negativePrompt:
      (inpaintActive && ui.inpaintNegativePrompt) ||
      values.negativePrompt ||
      undefined,
    params,
    loras: values.loras && values.loras.length > 0 ? values.loras : undefined,
    references: values.references,
    extraParams,
    visibility: values.visibility,
    sessionId: ctx.activeSessionId ?? undefined,
  };
}
