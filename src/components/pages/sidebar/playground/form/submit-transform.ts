import type {
  GenerationFormValues,
  GenerationMode,
  PlaygroundSubmitBody,
} from "@/lib/validation/playground";

export type SubmitContext = {
  activeSessionId: string | null;
  mode: GenerationMode;
  uploadMaskAsync: (file: File) => Promise<{ url: string }>;
};

// Pure-ish transform from RHF form values to the upstream submit body.
// The only side effect is the optional mask upload (R2 -> URL) when an
// inpaint data URL is present; everything else is field reshaping.
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
  const paramsWithN: Record<string, unknown> = {
    ...existingParams,
    n: variants,
  };

  if (ctx.mode === "inpaint" && ui.inpaintMaskDataUrl) {
    const blob = await (await fetch(ui.inpaintMaskDataUrl)).blob();
    const file = new File([blob], "mask.png", { type: "image/png" });
    const uploaded = await ctx.uploadMaskAsync(file);
    paramsWithN.maskUrl = uploaded.url;
  }

  const wireExtras =
    (values.extraParams as Record<string, unknown> | undefined) ?? {};
  const cleanedExtras =
    Object.keys(wireExtras).length > 0 ? wireExtras : undefined;

  return {
    model: values.model,
    mode: ctx.mode,
    prompt: values.prompt,
    negativePrompt: values.negativePrompt,
    params: paramsWithN as never,
    loras: values.loras,
    references: values.references,
    extraParams: cleanedExtras,
    visibility: values.visibility,
    sessionId: ctx.activeSessionId ?? undefined,
  };
}
