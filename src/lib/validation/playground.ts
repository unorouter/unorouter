import type { Static } from "elysia";
import { t } from "elysia";
import type { TLiteral, TUnion } from "@sinclair/typebox/type";

// Pulls the literal values out of a TypeBox string-literal union so the
// sampler/scheduler arrays stay a single source of truth with the schema.
// Schemas are written inline as `t.Union([t.Literal(...)])` (Eden RPC needs
// the literals statically visible at the route); the arrays derive from them.
function unionLiterals<T extends string>(
  union: TUnion<TLiteral<T>[]>,
): readonly T[] {
  return union.anyOf.map((m) => m.const);
}

// Server `assertGenerationModelAllowed` checks pricing cache before submit.
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

// SDXL family; Flux 2 uses KSamplerSelect with different naming.
export const generationSampler = t.Union([
  t.Literal("euler"),
  t.Literal("euler_ancestral"),
  t.Literal("dpmpp_2m"),
  t.Literal("dpmpp_2m_sde"),
  t.Literal("dpmpp_3m_sde"),
  t.Literal("ddim"),
  t.Literal("uni_pc"),
]);
export type GenerationSampler = Static<typeof generationSampler>;

export const generationScheduler = t.Union([
  t.Literal("normal"),
  t.Literal("karras"),
  t.Literal("exponential"),
  t.Literal("sgm_uniform"),
  t.Literal("simple"),
]);
export type GenerationScheduler = Static<typeof generationScheduler>;

// `models.ts` derives SDXL_SAMPLERS / SDXL_SCHEDULERS from these so the model
// catalog can't desync from the validator (e.g. a missing "simple").
export const GENERATION_SAMPLERS = unionLiterals(generationSampler);
export const GENERATION_SCHEDULERS = unionLiterals(generationScheduler);

// Flux 2 locked to 1024x1024 by template; form hides size picker for it.
export const generationSize = t.Union([
  t.Literal("1024x1024"),
  t.Literal("832x1216"),
  t.Literal("1216x832"),
  t.Literal("1024x1536"),
  t.Literal("1536x1024"),
]);

export const generationMode = t.Union([
  t.Literal("txt2img"),
  t.Literal("img2img"),
  t.Literal("upscale"),
  t.Literal("adetailer"),
  t.Literal("inpaint"),
  t.Literal("edit"),
]);
export type GenerationMode = Static<typeof generationMode>;

// LoRA chain independent of main list: face-fixers often want a face-specific
// LoRA the main pass shouldn't.
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

export const generationControlNetKind = t.Union([
  t.Literal("depth"),
  t.Literal("canny"),
  t.Literal("openpose"),
]);
export type GenerationControlNetKind = Static<
  typeof generationControlNetKind
>;

export const playgroundControlNet = t.Object({
  kind: generationControlNetKind,
  imageUrl: t.String({ format: "uri", maxLength: 2048 }),
  weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
});
export type PlaygroundControlNet = Static<typeof playgroundControlNet>;

export const generationLayerDiffusion = t.Object({
  weight: t.Number({ minimum: 0, maximum: 2 }),
});

// Width/height bounds are broad; adapter narrows per model (Flux 2 locked to
// 1024x1024; SDXL aborts >2048 in the ComfyUI worker).
export const generationParams = t.Object({
  width: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
  height: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
  steps: t.Optional(t.Integer({ minimum: 1, maximum: 80 })),
  cfg: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  guidance: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  sampler: t.Optional(generationSampler),
  scheduler: t.Optional(generationScheduler),
  seed: t.Optional(t.Integer({ minimum: 0, maximum: 4_294_967_295 })),
  denoise: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  // Skipped on Flux 2 (template doesn't expose; form hides toggle).
  hiresDenoise: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  hiresUpscale: t.Optional(t.Number({ minimum: 1, maximum: 4 })),
  // worker-comfyui caps batch_size at 4 inside the adapter.
  n: t.Optional(t.Integer({ minimum: 1, maximum: 4 })),
  // Sync-image vendor knobs; ComfyUI ignores them.
  quality: t.Optional(t.String({ maxLength: 32 })),
  outputFormat: t.Optional(t.String({ maxLength: 16 })),
  watermark: t.Optional(t.Boolean()),
  background: t.Optional(t.String({ maxLength: 32 })),
  strength: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  initImageUrl: t.Optional(t.String({ format: "uri", maxLength: 2048 })),
  maskUrl: t.Optional(t.String({ format: "uri", maxLength: 2048 })),
  vae: t.Optional(t.String({ maxLength: 128 })),
  upscaler: t.Optional(t.String({ maxLength: 128 })),
  upscalerMultiplier: t.Optional(t.Number({ minimum: 1, maximum: 4 })),
  hiresSteps: t.Optional(t.Integer({ minimum: 1, maximum: 80 })),
  embeddings: t.Optional(
    t.Array(
      t.Object({
        name: t.String({ maxLength: 256 }),
        weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
      }),
      { maxItems: 6 },
    ),
  ),
  controlNet: t.Optional(playgroundControlNet),
  adetailer: t.Optional(playgroundAdetailer),
  layerDiffusion: t.Optional(generationLayerDiffusion),
  // SDXL-family only; other families ignore both.
  clipSkip: t.Optional(t.Integer({ minimum: 0, maximum: 12 })),
  ensd: t.Optional(t.Integer({ minimum: 0, maximum: 4_294_967_295 })),
});
export type GenerationParams = Static<typeof generationParams>;

export const generationLoraEntry = t.Object({
  name: t.String({ maxLength: 256 }),
  weight: t.Number({ minimum: 0, maximum: 2 }),
  source: t.Optional(t.String({ maxLength: 64 })),
});
export type LoraEntry = Static<typeof generationLoraEntry>;

// Weight currently advisory: stock ReferenceLatent node's WeightInput is empty.
export const generationReferenceEntry = t.Object({
  url: t.String({ format: "uri", maxLength: 2048 }),
  name: t.Optional(t.String({ maxLength: 200 })),
  weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
});
export type ReferenceEntry = Static<typeof generationReferenceEntry>;

// UI-only state stripped before submit by `toSubmitBody`
// (components/pages/sidebar/playground/form/submit-transform.ts).
export const generationFormUi = t.Object({
  variants: t.Optional(t.Integer({ minimum: 1, maximum: 4 })),
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
  extraParams: t.Optional(t.Record(t.String(), t.Any())),
  visibility: t.Optional(generationVisibility),
  sessionId: t.Optional(t.String({ maxLength: 64 })),
});
export type PlaygroundSubmitBody = Static<typeof playgroundSubmitBody>;

export const generationFormValues = t.Composite([
  playgroundSubmitBody,
  t.Object({ ui: t.Optional(generationFormUi) }),
]);
export type GenerationFormValues = Static<typeof generationFormValues>;

export const playgroundHistoryQuery = t.Object({
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  cursor: t.Optional(t.String({ maxLength: 64 })),
  model: t.Optional(playgroundModel),
});
export type PlaygroundHistoryQuery = Static<typeof playgroundHistoryQuery>;

export const generationCloneMode = t.Union([
  t.Literal("restore"),
  t.Literal("regenerate"),
]);
export type GenerationCloneMode = Static<typeof generationCloneMode>;

// Loose typing on nested fields so older exports with extra keys still parse.
// Images embed base64 so an export is self-contained (no R2 dependency).
export const playgroundSnapshot = t.Object({
  version: t.Literal("unorouter-generation-1"),
  model: t.String({ minLength: 1, maxLength: 128 }),
  prompt: t.String({ minLength: 1, maxLength: 8000 }),
  negativePrompt: t.Union([t.String({ maxLength: 4000 }), t.Null()]),
  params: t.Unknown(),
  loras: t.Unknown(),
  references: t.Unknown(),
  extraParams: t.Unknown(),
  images: t.Array(
    t.Object({
      sequenceIndex: t.Integer({ minimum: 0, maximum: 15 }),
      base64: t.String(),
      mimeType: t.Union([t.String({ maxLength: 64 }), t.Null()]),
      width: t.Union([t.Integer(), t.Null()]),
      height: t.Union([t.Integer(), t.Null()]),
    }),
    { maxItems: 16 },
  ),
});
export type PlaygroundSnapshot = Static<typeof playgroundSnapshot>;

// Stored oldest-first so restore preserves sessionOrder layout.
export const sessionSnapshot = t.Object({
  version: t.Literal("unorouter-session-1"),
  session: t.Object({
    title: t.Union([t.String({ maxLength: 256 }), t.Null()]),
    firstModel: t.Union([t.String({ maxLength: 128 }), t.Null()]),
  }),
  snapshots: t.Array(playgroundSnapshot, { maxItems: 200 }),
});
export type SessionSnapshot = Static<typeof sessionSnapshot>;

// Stateless poll: the client owns the playground row and passes the upstream
// task id back so the server only forwards the upstream status check.
export const playgroundPollBody = t.Object({
  taskId: t.String({ minLength: 1, maxLength: 128 }),
});
export type PlaygroundPollBody = Static<typeof playgroundPollBody>;

// A generated image returned inline by /submit and /poll. The client writes
// the bytes into its local `media` table; R2 upload is deferred to sync.
export const generatedImage = t.Object({
  resultUrl: t.Union([t.String(), t.Null()]),
  base64: t.String(),
  mimeType: t.String(),
  sizeBytes: t.Integer(),
});
export type GeneratedImage = Static<typeof generatedImage>;

export const playgroundReferenceUploadBody = t.Object({
  file: t.File({
    maxSize: "10m",
    type: ["image/png", "image/jpeg", "image/webp"],
  }),
});

export const generationBaseModel = t.Union([
  t.Literal("sdxl"),
  t.Literal("pony"),
  t.Literal("flux2"),
  t.Literal("z-image"),
]);
export type GenerationBaseModel = Static<typeof generationBaseModel>;

export const loraCatalogQuery = t.Object({
  baseModel: t.Optional(generationBaseModel),
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

// Forgiving so the worker can add categories without a schema bump.
export const embeddingCatalogQuery = t.Object({
  baseModel: t.Optional(generationBaseModel),
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
  baseModel: t.Optional(generationBaseModel),
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
