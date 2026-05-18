import type { Static } from "elysia";
import { t } from "elysia";

// Catalog is upstream-driven via /api/pricing; server-side
// assertGenerationModelAllowed checks the pricing cache before submit.
export const playgroundModel = t.String({ minLength: 1, maxLength: 128 });
export type PlaygroundModel = Static<typeof playgroundModel>;

export const generationVisibility = t.Union([
  t.Literal("private"),
  t.Literal("unlisted"),
  t.Literal("public"),
]);
export type PlaygroundVisibility = Static<typeof generationVisibility>;

export const generationStatus = t.Union([
  t.Literal("pending"),
  t.Literal("submitted"),
  t.Literal("queued"),
  t.Literal("in_progress"),
  t.Literal("success"),
  t.Literal("failure"),
]);
export type GenerationStatus = Static<typeof generationStatus>;

// SDXL family samplers; Flux 2 uses KSamplerSelect with different naming.
export const generationSampler = t.Union([
  t.Literal("euler"),
  t.Literal("euler_ancestral"),
  t.Literal("dpmpp_2m"),
  t.Literal("dpmpp_2m_sde"),
  t.Literal("dpmpp_3m_sde"),
  t.Literal("ddim"),
  t.Literal("uni_pc"),
]);

export const generationScheduler = t.Union([
  t.Literal("normal"),
  t.Literal("karras"),
  t.Literal("exponential"),
  t.Literal("sgm_uniform"),
  t.Literal("simple"),
]);

// Flux 2 is locked to 1024x1024 by the template; form hides size picker for it.
export const generationSize = t.Union([
  t.Literal("1024x1024"),
  t.Literal("832x1216"),
  t.Literal("1216x832"),
  t.Literal("1024x1536"),
  t.Literal("1536x1024"),
]);

// Mode selects sub-graph and required fields:
//   txt2img    no init image
//   img2img    initImageUrl required, denoise drives strength
//   upscale    initImageUrl required, no diffusion (or low denoise)
//   adetailer  initImageUrl required, YOLO + inpaint on detections
//   inpaint    initImageUrl + maskUrl required
//   edit       single or multi reference, model-family specific
export const generationMode = t.Union([
  t.Literal("txt2img"),
  t.Literal("img2img"),
  t.Literal("upscale"),
  t.Literal("adetailer"),
  t.Literal("inpaint"),
  t.Literal("edit"),
]);
export type GenerationMode = Static<typeof generationMode>;

// LoRA chain is independent of the main list because face-fixer models often
// want a face-specific LoRA the main pass shouldn't.
export const playgroundAdetailer = t.Object({
  yoloModel: t.String({ maxLength: 128 }),
  prompt: t.Optional(t.String({ maxLength: 2000 })),
  negativePrompt: t.Optional(t.String({ maxLength: 2000 })),
  steps: t.Optional(t.Integer({ minimum: 0, maximum: 80 })),
  confidence: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  maskBlur: t.Optional(t.Integer({ minimum: 0, maximum: 64 })),
  denoise: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  inpaintOnlyMasked: t.Optional(t.Boolean()),
  loras: t.Optional(
    t.Array(
      t.Object({
        name: t.String({ maxLength: 256 }),
        weight: t.Number({ minimum: 0, maximum: 2 }),
      }),
      { maxItems: 6 },
    ),
  ),
});
export type PlaygroundAdetailer = Static<typeof playgroundAdetailer>;

// Preprocessor selection is implicit by `kind`; each is wired into its own
// ComfyUI template node.
export const generationControlNetKind = t.Union([
  t.Literal("depth"),
  t.Literal("canny"),
  t.Literal("openpose"),
]);

export const playgroundControlNet = t.Object({
  kind: generationControlNetKind,
  imageUrl: t.String({ format: "uri", maxLength: 2048 }),
  weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
});
export type PlaygroundControlNet = Static<typeof playgroundControlNet>;

// Weight drives the alpha-leak slider; template branches the VAE decode +
// saves a PNG with alpha when enabled.
export const generationLayerDiffusion = t.Object({
  weight: t.Number({ minimum: 0, maximum: 2 }),
});

// Optional fields mean "use the template default for the chosen model".
// Server merges these against MODEL_CAPABILITIES defaults before the upstream
// call. Width/height bounds are broad; descriptor + adapter narrow per model
// (Flux 2 locked to 1024x1024; SDXL aborts >2048 in the ComfyUI worker).
export const generationParams = t.Object({
  width: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
  height: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
  steps: t.Optional(t.Integer({ minimum: 1, maximum: 80 })),
  cfg: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  guidance: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  sampler: t.Optional(generationSampler),
  scheduler: t.Optional(generationScheduler),
  // Empty seed: template default's auto_random fires at adapter side.
  seed: t.Optional(t.Integer({ minimum: 0, maximum: 4_294_967_295 })),
  denoise: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  // Skipped on Flux 2 (template doesn't expose; form hides toggle).
  hiresDenoise: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  hiresUpscale: t.Optional(t.Number({ minimum: 1, maximum: 4 })),
  // Worker-comfyui caps batch_size at 4 inside the adapter.
  n: t.Optional(t.Integer({ minimum: 1, maximum: 4 })),
  // Sync-image vendor knobs; ComfyUI ignores them.
  quality: t.Optional(t.String({ maxLength: 32 })),
  outputFormat: t.Optional(t.String({ maxLength: 16 })),
  watermark: t.Optional(t.Boolean()),
  background: t.Optional(t.String({ maxLength: 32 })),
  strength: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  initImageUrl: t.Optional(t.String({ format: "uri", maxLength: 2048 })),
  maskUrl: t.Optional(t.String({ format: "uri", maxLength: 2048 })),
  // "Automatic" / "None" skip the override.
  vae: t.Optional(t.String({ maxLength: 128 })),
  // When present worker uses it instead of template default and skips its
  // built-in latent-upscale path.
  upscaler: t.Optional(t.String({ maxLength: 128 })),
  upscalerMultiplier: t.Optional(t.Number({ minimum: 1, maximum: 4 })),
  hiresSteps: t.Optional(t.Integer({ minimum: 1, maximum: 80 })),
  // Worker rewrites `embedding:<name>:weight` tokens into ComfyUI
  // CLIPTextEncode syntax.
  embeddings: t.Optional(
    t.Array(
      t.Object({
        name: t.String({ maxLength: 256 }),
        weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
      }),
      { maxItems: 6 },
    ),
  ),
  // Image rehosted through R2 first.
  controlNet: t.Optional(playgroundControlNet),
  adetailer: t.Optional(playgroundAdetailer),
  layerDiffusion: t.Optional(generationLayerDiffusion),
  // SDXL-family only; other families ignore both.
  clipSkip: t.Optional(t.Integer({ minimum: 0, maximum: 12 })),
  ensd: t.Optional(t.Integer({ minimum: 0, maximum: 4_294_967_295 })),
});
export type GenerationParams = Static<typeof generationParams>;

// `source` is informational; picker resolves to a catalog row server-side.
// v1 forwards only `name` and `weight` to the upstream adapter.
export const generationLoraEntry = t.Object({
  name: t.String({ maxLength: 256 }),
  weight: t.Number({ minimum: 0, maximum: 2 }),
  source: t.Optional(t.String({ maxLength: 64 })),
});

// R2-hosted preferred; arbitrary public URLs work unless they reject
// server-IP fetches (Wikimedia). Weight is advisory and not currently wired
// to the stock ReferenceLatent node (template's WeightInput is empty).
export const generationReferenceEntry = t.Object({
  url: t.String({ format: "uri", maxLength: 2048 }),
  name: t.Optional(t.String({ maxLength: 200 })),
  weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
});

// UI-only state held on the form but stripped before submit by `toSubmitBody`
// in components/pages/sidebar/playground/form/submit-transform.ts. Lives next
// to the wire schema so RHF validates both shapes against one resolver.
export const generationFormUi = t.Object({
  // Translated into `params.n` by the submit transform.
  variants: t.Optional(t.Integer({ minimum: 1, maximum: 4 })),
  // Submit uploads to R2 and threads the URL into params.maskUrl.
  inpaintMaskDataUrl: t.Optional(t.String()),
  inpaintBrushSize: t.Optional(t.Integer({ minimum: 4, maximum: 128 })),
  inpaintBrushOpacity: t.Optional(t.Number({ minimum: 0.05, maximum: 1 })),
});
export type GenerationFormUi = Static<typeof generationFormUi>;

export const playgroundSubmitBody = t.Object({
  model: playgroundModel,
  // Legacy clients omit `mode`; server treats them as txt2img.
  mode: t.Optional(generationMode),
  prompt: t.String({ minLength: 1, maxLength: 8000 }),
  negativePrompt: t.Optional(t.String({ maxLength: 4000 })),
  params: t.Optional(generationParams),
  loras: t.Optional(t.Array(generationLoraEntry, { maxItems: 12 })),
  references: t.Optional(t.Array(generationReferenceEntry, { maxItems: 6 })),
  // Free-form spillover for per-model knobs.
  extraParams: t.Optional(t.Record(t.String(), t.Any())),
  visibility: t.Optional(generationVisibility),
  nsfw: t.Optional(t.Boolean()),
  // Absent means "start a new session"; server creates one and uses its id.
  sessionId: t.Optional(t.String({ maxLength: 64 })),
});
export type PlaygroundSubmitBody = Static<typeof playgroundSubmitBody>;

// Submit transform strips `ui` and applies its effects: variants becomes
// params.n; inpaintMaskDataUrl becomes uploaded params.maskUrl.
export const generationFormValues = t.Composite([
  playgroundSubmitBody,
  t.Object({ ui: t.Optional(generationFormUi) }),
]);
export type GenerationFormValues = Static<typeof generationFormValues>;

// Cursor-style pagination keyed by createdAt (descending) so pages stay stable
// as new rows arrive.
export const playgroundHistoryQuery = t.Object({
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  cursor: t.Optional(t.String({ maxLength: 64 })),
  model: t.Optional(playgroundModel),
});
export type PlaygroundHistoryQuery = Static<typeof playgroundHistoryQuery>;

// Clone-mode:
//   restore    recreate the row with the original images re-hosted (no upstream call)
//   regenerate fire a fresh upstream submission using the same prompt+params
export const generationCloneMode = t.Union([
  t.Literal("restore"),
  t.Literal("regenerate"),
]);
export type GenerationCloneMode = Static<typeof generationCloneMode>;

// Loose typing on nested fields (params, loras, refs, extraParams) so
// slightly-older exports with extra keys still parse.
export const playgroundSnapshot = t.Object({
  version: t.Literal("unorouter-generation-1"),
  model: t.String({ minLength: 1, maxLength: 128 }),
  prompt: t.String({ minLength: 1, maxLength: 8000 }),
  negativePrompt: t.Union([t.String({ maxLength: 4000 }), t.Null()]),
  params: t.Unknown(),
  loras: t.Unknown(),
  references: t.Unknown(),
  extraParams: t.Unknown(),
  nsfw: t.Boolean(),
  images: t.Array(
    t.Object({
      sequenceIndex: t.Integer({ minimum: 0, maximum: 15 }),
      r2Url: t.String({ format: "uri", maxLength: 2048 }),
      mimeType: t.Union([t.String({ maxLength: 64 }), t.Null()]),
      width: t.Union([t.Integer(), t.Null()]),
      height: t.Union([t.Integer(), t.Null()]),
    }),
    { maxItems: 16 },
  ),
});
export type PlaygroundSnapshot = Static<typeof playgroundSnapshot>;

// Snapshots stored oldest-first so restore preserves sessionOrder layout.
export const sessionSnapshot = t.Object({
  version: t.Literal("unorouter-session-1"),
  session: t.Object({
    title: t.Union([t.String({ maxLength: 256 }), t.Null()]),
    firstModel: t.Union([t.String({ maxLength: 128 }), t.Null()]),
  }),
  snapshots: t.Array(playgroundSnapshot, { maxItems: 200 }),
});
export type SessionSnapshot = Static<typeof sessionSnapshot>;

// Union dispatches on the `version` literal.
export const playgroundImportBody = t.Object({
  payload: t.Union([playgroundSnapshot, sessionSnapshot]),
  mode: generationCloneMode,
});

export const generationVisibilityBody = t.Object({
  visibility: generationVisibility,
});

export const playgroundReferenceUploadBody = t.Object({
  file: t.File({
    maxSize: "10m",
    type: ["image/png", "image/jpeg", "image/webp"],
  }),
});

export const loraCatalogQuery = t.Object({
  baseModel: t.Optional(
    t.Union([
      t.Literal("sdxl"),
      t.Literal("pony"),
      t.Literal("flux2"),
      t.Literal("z-image"),
    ]),
  ),
  category: t.Optional(
    t.Union([
      t.Literal("anatomy"),
      t.Literal("style"),
      t.Literal("character"),
      t.Literal("concept"),
    ]),
  ),
});
export type LoraCatalogQuery = Static<typeof loraCatalogQuery>;

// Category enums differ per catalog; validator stays forgiving so the worker
// can add new categories without a schema bump.
export const embeddingCatalogQuery = t.Object({
  baseModel: t.Optional(
    t.Union([
      t.Literal("sdxl"),
      t.Literal("pony"),
      t.Literal("flux2"),
      t.Literal("z-image"),
    ]),
  ),
  category: t.Optional(t.String({ maxLength: 64 })),
});
export type EmbeddingCatalogQuery = Static<typeof embeddingCatalogQuery>;

export const upscalerCatalogQuery = t.Object({
  category: t.Optional(
    t.Union([
      t.Literal("latent"),
      t.Literal("esrgan"),
      t.Literal("swinir"),
      t.Literal("dat"),
      t.Literal("apisr"),
      t.Literal("other"),
    ]),
  ),
});
export type UpscalerCatalogQuery = Static<typeof upscalerCatalogQuery>;

export const controlNetCatalogQuery = t.Object({
  baseModel: t.Optional(
    t.Union([
      t.Literal("sdxl"),
      t.Literal("pony"),
      t.Literal("flux2"),
      t.Literal("z-image"),
    ]),
  ),
  kind: t.Optional(generationControlNetKind),
});
export type ControlNetCatalogQuery = Static<typeof controlNetCatalogQuery>;

// No webp: worker expects PNG/JPEG for the mask sub-graph.
export const playgroundMaskUploadBody = t.Object({
  file: t.File({
    maxSize: "10m",
    type: ["image/png", "image/jpeg"],
  }),
});
