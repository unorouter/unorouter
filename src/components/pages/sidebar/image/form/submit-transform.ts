import { blobUrlToDataUri } from "@/lib/db/client/data/media/blob-url";
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

  if (ctx.mode === "inpaint" && ui.inpaintMaskDataUrl) {
    paramsWithN.maskUrl = ui.inpaintMaskDataUrl;
  }

  const wireExtras =
    (values.extraParams as Record<string, unknown> | undefined) ?? {};
  const cleanedExtras =
    Object.keys(wireExtras).length > 0 ? wireExtras : undefined;

  const loras =
    values.loras && values.loras.length > 0 ? values.loras : undefined;

  return {
    model: values.model,
    mode: ctx.mode,
    prompt: values.prompt,
    negativePrompt: values.negativePrompt || undefined,
    params: paramsWithN as never,
    loras,
    references: values.references,
    extraParams: cleanedExtras,
    visibility: values.visibility,
    sessionId: ctx.activeSessionId ?? undefined,
  };
}
