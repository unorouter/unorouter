import { blobUrlToDataUri } from "@/lib/db/client/data/media/blob-url";
import { CUSTOM_CIVITAI_MODEL_ID } from "../image-constants";
import type {
  GenerationFormValues,
  GenerationMode,
  PlaygroundSubmitBody,
} from "@/lib/validation/playground";

export type SubmitContext = {
  activeSessionId: string | null;
  mode: GenerationMode;
};

/** Params the UI collects that the server reads off the params object. */
const FORWARDED_PARAM_KEYS = [
  "width",
  "height",
  "steps",
  "cfg",
  "guidance",
  "sampler",
  "scheduler",
  "clipSkip",
  "ensd",
  "seed",
  "denoise",
  "strength",
  "quality",
  "outputFormat",
  "watermark",
  "background",
  "initImageUrl",
  "maskUrl",
  "vae",
  "upscalerMultiplier",
  "hiresSteps",
  "hiresDenoise",
  "hiresUpscale",
  "embeddings",
  "adetailer",
  "layerDiffusion",
] as const;

export async function toSubmitBody(
  values: GenerationFormValues,
  ctx: SubmitContext,
): Promise<PlaygroundSubmitBody> {
  const ui = values.ui ?? {};
  const variants =
    typeof ui.variants === "number" && [1, 2, 4].includes(ui.variants)
      ? ui.variants
      : 1;

  const existingParams =
    (values.params as Record<string, unknown> | undefined) ?? {};

  const forwarded: Record<string, unknown> = {};
  for (const key of FORWARDED_PARAM_KEYS) {
    if (existingParams[key] !== undefined) forwarded[key] = existingParams[key];
  }

  const paramsWithN: Record<string, unknown> = {
    ...existingParams,
    ...forwarded,
    n: variants,
  };

  // A blob: URL only means something inside this document, and the init image is FORWARDED
  // to the provider as seedImage. Resolve it back to bytes before it leaves the browser,
  // else every img2img/inpaint/upscale/hires from a generated result sends a dead reference.
  const initImageUrl = paramsWithN.initImageUrl;
  if (typeof initImageUrl === "string" && initImageUrl.startsWith("blob:")) {
    paramsWithN.initImageUrl = await blobUrlToDataUri(initImageUrl);
  }

  // A mask without the image it was painted on is meaningless, and the provider rejects the
  // pair outright: removing the init image while a mask was still stored failed the NEXT
  // plain generation with an opaque error rather than doing an ordinary text2img run.
  const hasInitImage =
    typeof paramsWithN.initImageUrl === "string" && !!paramsWithN.initImageUrl;
  if (!hasInitImage) delete paramsWithN.maskUrl;

  if (ctx.mode === "inpaint" && ui.inpaintMaskDataUrl && hasInitImage) {
    paramsWithN.maskUrl = ui.inpaintMaskDataUrl;
    // Every inpaint field is an OVERRIDE: left empty, the pass runs on what the form already
    // holds, so a user who just wants to repaint a region with the same setup types nothing.
    if (ui.inpaintStrength !== undefined) {
      paramsWithN.strength = ui.inpaintStrength;
    }
    if (ui.inpaintNegativePrompt) {
      paramsWithN.negativePrompt = ui.inpaintNegativePrompt;
    }
  }

  const wireExtras = {
    ...((values.extraParams as Record<string, unknown> | undefined) ?? {}),
    // The checkpoint the provider loads rides here, so an inpaint override replaces it for
    // this request only rather than changing what the form is set to.
    ...(ctx.mode === "inpaint" && ui.inpaintAir
      ? { air: ui.inpaintAir, airName: ui.inpaintAirName }
      : {}),
  };
  const cleanedExtras =
    Object.keys(wireExtras).length > 0 ? wireExtras : undefined;

  const loras =
    values.loras && values.loras.length > 0 ? values.loras : undefined;

  // The inpaint pass can run a different checkpoint than the one that made the image (a
  // realism model fixing a hand on an anime render), so its AIR replaces the form's for this
  // request only. The passthrough model id has to come along with it: the AIR is what the
  // provider loads, but the catalog id is what routes there.
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
