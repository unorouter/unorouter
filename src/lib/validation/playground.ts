import type { Static } from "elysia";
import { t } from "elysia";
import { unionLiterals } from "./helpers";
import { env } from "@/lib/config/env";

export const MAX_IMAGES_PER_GEN = 4;

export const PLAYGROUND_GENERATION_FORMAT =
  `${env.appName.toLowerCase()}-generation-1` as `${string}-generation-1`;
export const PLAYGROUND_SESSION_FORMAT =
  `${env.appName.toLowerCase()}-session-1` as `${string}-session-1`;

export function isPlaygroundSessionFormat(
  payload: PlaygroundSnapshot | SessionSnapshot,
): payload is SessionSnapshot {
  return payload.version === PLAYGROUND_SESSION_FORMAT;
}

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

export type GenerationSamplerValue = Static<typeof generationSampler>;
export type GenerationSchedulerValue = Static<typeof generationScheduler>;

export const GENERATION_SAMPLERS = unionLiterals(generationSampler);
export const GENERATION_SCHEDULERS = unionLiterals(generationScheduler);

export const generationMode = t.Union([
  t.Literal("txt2img"),
  t.Literal("img2img"),
  t.Literal("upscale"),
  t.Literal("adetailer"),
  t.Literal("inpaint"),
  t.Literal("edit"),
]);
export type GenerationMode = Static<typeof generationMode>;

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

export type AdetailerParams = Static<typeof playgroundAdetailer>;

export const generationLayerDiffusion = t.Object({
  weight: t.Number({ minimum: 0, maximum: 2 }),
});

// There is no object storage: the browser holds the bytes and sends a base64 data URI,
// which is neither a `uri` by format nor anywhere near 2048 chars. Accepting a bare string
// would take any input at all, so the shape is still pinned - a downscaled image data URI
// or an https URL, nothing else. The cap is generous enough for a 1024px long edge
// (MAX_LONG_EDGE) at the encoder quality the uploader uses, and still bounds the body.
const MAX_IMAGE_SOURCE_LENGTH = 8 * 1024 * 1024;
export const imageSource = t.String({
  pattern: "^(data:image/(png|jpeg|webp);base64,|https://)",
  maxLength: MAX_IMAGE_SOURCE_LENGTH,
});

export const generationParams = t.Object({
  width: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
  height: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
  steps: t.Optional(t.Integer({ minimum: 1, maximum: 80 })),
  cfg: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  guidance: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  // Free-form: each backend has its own vocabulary (ComfyUI spells a sampler
  // euler_ancestral, Runware spells the same idea "Euler a"), and the descriptor decides
  // which names to offer. The submit path drops the value for a model that takes none.
  sampler: t.Optional(t.String({ maxLength: 64 })),
  scheduler: t.Optional(t.String({ maxLength: 64 })),
  seed: t.Optional(t.Integer({ minimum: 0, maximum: 4_294_967_295 })),
  denoise: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  hiresDenoise: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  hiresUpscale: t.Optional(t.Number({ minimum: 1, maximum: 4 })),
  n: t.Optional(t.Integer({ minimum: 1, maximum: MAX_IMAGES_PER_GEN })),
  quality: t.Optional(t.String({ maxLength: 32 })),
  outputFormat: t.Optional(t.String({ maxLength: 16 })),
  watermark: t.Optional(t.Boolean()),
  background: t.Optional(t.String({ maxLength: 32 })),
  strength: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  initImageUrl: t.Optional(imageSource),
  maskUrl: t.Optional(imageSource),
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
  adetailer: t.Optional(playgroundAdetailer),
  layerDiffusion: t.Optional(generationLayerDiffusion),
  clipSkip: t.Optional(t.Integer({ minimum: 0, maximum: 12 })),
  ensd: t.Optional(t.Integer({ minimum: 0, maximum: 4_294_967_295 })),
});

export const generationLoraEntry = t.Object({
  name: t.String({ maxLength: 256 }),
  weight: t.Number({ minimum: 0, maximum: 2 }),
  source: t.Optional(t.String({ maxLength: 64 })),
});
export type LoraEntry = Static<typeof generationLoraEntry>;

export const generationReferenceEntry = t.Object({
  url: imageSource,
  name: t.Optional(t.String({ maxLength: 200 })),
  weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
});
export type ReferenceEntry = Static<typeof generationReferenceEntry>;

export type GenerationParams = Static<typeof generationParams>;

export const generationFormUi = t.Object({
  variants: t.Optional(t.Integer({ minimum: 1, maximum: 4 })),
  inpaintMaskDataUrl: t.Optional(t.String()),
  inpaintBrushSize: t.Optional(t.Integer({ minimum: 4, maximum: 128 })),
  inpaintBrushOpacity: t.Optional(t.Number({ minimum: 0.05, maximum: 1 })),
  // The user-brought checkpoint and the reference it was resolved from. Submitting navigates
  // to the result and rebuilds the form, so a field-local copy does not survive a generation.
  air: t.Optional(t.String({ maxLength: 256 })),
  airName: t.Optional(t.String({ maxLength: 256 })),
  airArchitecture: t.Optional(t.String({ maxLength: 64 })),
  airQuery: t.Optional(t.String({ maxLength: 2048 })),
});
export type GenerationFormUi = Static<typeof generationFormUi>;

export const playgroundSubmitBody = t.Object({
  model: playgroundModel,
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

export const generationCloneMode = t.Union([
  t.Literal("restore"),
  t.Literal("regenerate"),
]);
export type GenerationCloneMode = Static<typeof generationCloneMode>;

export const playgroundSnapshot = t.Object({
  version: t.Literal(PLAYGROUND_GENERATION_FORMAT),
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

export const sessionSnapshot = t.Object({
  version: t.Literal(PLAYGROUND_SESSION_FORMAT),
  session: t.Object({
    title: t.Union([t.String({ maxLength: 256 }), t.Null()]),
    firstModel: t.Union([t.String({ maxLength: 128 }), t.Null()]),
  }),
  snapshots: t.Array(playgroundSnapshot, { maxItems: 200 }),
});
export type SessionSnapshot = Static<typeof sessionSnapshot>;

export const playgroundPollBody = t.Object({
  taskId: t.String({ minLength: 1, maxLength: 128 }),
});

export const generatedImage = t.Object({
  resultUrl: t.Union([t.String(), t.Null()]),
  base64: t.String(),
  mimeType: t.String(),
  sizeBytes: t.Integer(),
  // Diffusion backends pick a seed when the request omits one. Per image, not per
  // snapshot: a batch gets a different seed for each result.
  seed: t.Optional(t.Integer()),
});
export type GeneratedImage = Static<typeof generatedImage>;

export const generationBaseModel = t.Union([
  t.Literal("sdxl"),
  t.Literal("pony"),
  t.Literal("flux2"),
  t.Literal("z-image"),
]);

// Runware exposes ~277k LoRAs addressed by AIR, so the catalog is a live keyword search
// against its modelSearch task rather than a fixed list. `architecture` narrows to models
// compatible with the selected checkpoint (a Pony LoRA does not apply to Flux).
export const catalogSearchQuery = t.Object({
  search: t.Optional(t.String({ maxLength: 128 })),
  architecture: t.Optional(t.String({ maxLength: 32 })),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 50 })),
});
export type CatalogSearchQuery = Static<typeof catalogSearchQuery>;

export const catalogItem = t.Object({
  id: t.String(),
  air: t.String(),
  name: t.String(),
  architecture: t.Union([t.String(), t.Null()]),
  category: t.String(),
  heroImage: t.Union([t.String(), t.Null()]),
  defaultWeight: t.Number(),
  nsfwLevel: t.Union([t.Integer(), t.Null()]),
  // Many LoRAs are inert until their trigger word appears in the prompt, so a picker that
  // hides this ships a model that silently does nothing. The provider knows the words; not
  // surfacing them is what makes a working LoRA look broken.
  triggerWords: t.Union([t.String(), t.Null()]),
  // Names alone are frequently unreadable ("Detailer by Chad (XL_2400_Steps) (Use <lora:l30_1
  // : > ...)"), so the tag list plus a popularity signal is what actually tells a user what a
  // LoRA is for and whether anyone else found it good.
  tags: t.Array(t.String()),
  downloadCount: t.Union([t.Integer(), t.Null()]),
  thumbsUpCount: t.Union([t.Integer(), t.Null()]),
});
export type CatalogItem = Static<typeof catalogItem>;
