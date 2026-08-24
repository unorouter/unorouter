import type { Static } from "elysia";
import { t } from "elysia";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { env } from "@/lib/config/env";

export const MAX_IMAGES_PER_GEN = 4;

export const IMAGE_GENERATION_FORMAT: `${string}-generation-1` = `${env.appName.toLowerCase()}-generation-1`;
export const IMAGE_SESSION_FORMAT: `${string}-session-1` = `${env.appName.toLowerCase()}-session-1`;

export function isImageSessionFormat(
  payload: ImageSnapshotExport | SessionSnapshot,
): payload is SessionSnapshot {
  return payload.version === IMAGE_SESSION_FORMAT;
}

export const imageModelId = t.String({ minLength: 1, maxLength: 128 });
export type ImageModelId = Static<typeof imageModelId>;

export const imageVisibility = t.Union([
  t.Literal("private"),
  t.Literal("unlisted"),
  t.Literal("public"),
]);
export type ImageVisibility = Static<typeof imageVisibility>;

export const imageGenerationStatus = t.Union([
  t.Literal("success"),
  t.Literal("failure"),
]);
export type ImageGenerationStatus = Static<typeof imageGenerationStatus>;

export const imageMode = t.Union([
  t.Literal("txt2img"),
  t.Literal("img2img"),
  t.Literal("upscale"),
  t.Literal("adetailer"),
  t.Literal("inpaint"),
  t.Literal("edit"),
]);
export type ImageMode = Static<typeof imageMode>;

export const imageAdetailer = t.Object({
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

export type AdetailerParams = Static<typeof imageAdetailer>;

// base64 data URI or https URL only; no object storage.
const MAX_IMAGE_SOURCE_LENGTH = 8 * 1024 * 1024;
export const imageSource = t.String({
  pattern: "^(data:image/(png|jpeg|webp);base64,|https://)",
  maxLength: MAX_IMAGE_SOURCE_LENGTH,
});

export const imageParams = t.Object({
  width: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
  height: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
  steps: t.Optional(t.Integer({ minimum: 1, maximum: 80 })),
  cfg: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  guidance: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  sampler: t.Optional(t.String({ maxLength: 64 })),
  scheduler: t.Optional(t.String({ maxLength: 64 })),
  seed: t.Optional(t.Integer({ minimum: 0, maximum: 4_294_967_295 })),
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
  adetailer: t.Optional(imageAdetailer),
  clipSkip: t.Optional(t.Integer({ minimum: 0, maximum: 12 })),
});

export const imageLoraEntry = t.Object({
  name: t.String({ maxLength: 256 }),
  weight: t.Number({ minimum: 0, maximum: 2 }),
  source: t.Optional(t.String({ maxLength: 64 })),
});
export type LoraEntry = Static<typeof imageLoraEntry>;

export const imageReferenceEntry = t.Object({
  url: imageSource,
  name: t.Optional(t.String({ maxLength: 200 })),
  weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
});
export type ReferenceEntry = Static<typeof imageReferenceEntry>;

export type ImageParams = Static<typeof imageParams>;

export const imageFormUi = t.Object({
  variants: t.Optional(t.Integer({ minimum: 1, maximum: 4 })),
  inpaintMaskDataUrl: t.Optional(
    t.String({ maxLength: MAX_IMAGE_SOURCE_LENGTH }),
  ),
  inpaintBrushSize: t.Optional(t.Integer({ minimum: 4, maximum: 128 })),
  inpaintBrushOpacity: t.Optional(t.Number({ minimum: 0.05, maximum: 1 })),
  // Empty = use the form's checkpoint.
  inpaintAir: t.Optional(t.String({ maxLength: 256 })),
  inpaintAirName: t.Optional(t.String({ maxLength: 256 })),
  inpaintAirQuery: t.Optional(t.String({ maxLength: 2048 })),
  inpaintPrompt: t.Optional(t.String({ maxLength: 8000 })),
  inpaintNegativePrompt: t.Optional(t.String({ maxLength: 4000 })),
  inpaintStrength: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  air: t.Optional(t.String({ maxLength: 256 })),
  airName: t.Optional(t.String({ maxLength: 256 })),
  airArchitecture: t.Optional(t.String({ maxLength: 64 })),
  airQuery: t.Optional(t.String({ maxLength: 2048 })),
});
export type ImageFormUi = Static<typeof imageFormUi>;

export const submitExtraParams = t.Object({
  air: t.Optional(t.String({ maxLength: 256 })),
  airName: t.Optional(t.String({ maxLength: 256 })),
  airArchitecture: t.Optional(t.String({ maxLength: 64 })),
});
export type SubmitExtraParams = Static<typeof submitExtraParams>;

export const imageSubmitBody = t.Object({
  model: imageModelId,
  mode: t.Optional(imageMode),
  prompt: t.String({ minLength: 1, maxLength: 8000 }),
  negativePrompt: t.Optional(t.String({ maxLength: 4000 })),
  params: t.Optional(imageParams),
  loras: t.Optional(t.Array(imageLoraEntry, { maxItems: 12 })),
  references: t.Optional(t.Array(imageReferenceEntry, { maxItems: 6 })),
  extraParams: t.Optional(submitExtraParams),
  visibility: t.Optional(imageVisibility),
  sessionId: t.Optional(t.String({ maxLength: 64 })),
});
export type ImageSubmitBody = Static<typeof imageSubmitBody>;

export const imageFormValues = t.Composite([
  imageSubmitBody,
  t.Object({ ui: t.Optional(imageFormUi) }),
]);
export type ImageFormValues = Static<typeof imageFormValues>;

export const imageCloneMode = t.Union([
  t.Literal("restore"),
  t.Literal("regenerate"),
]);
export type ImageCloneMode = Static<typeof imageCloneMode>;

export const imageSnapshotExport = t.Object({
  version: t.Literal(IMAGE_GENERATION_FORMAT),
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
      // Optional so files written before it carried a seed still validate.
      seed: t.Optional(t.Union([t.Integer(), t.Null()])),
    }),
    { maxItems: 16 },
  ),
});
export type ImageSnapshotExport = Static<typeof imageSnapshotExport>;

export const sessionSnapshot = t.Object({
  version: t.Literal(IMAGE_SESSION_FORMAT),
  session: t.Object({
    title: t.Union([t.String({ maxLength: 256 }), t.Null()]),
    firstModel: t.Union([t.String({ maxLength: 128 }), t.Null()]),
  }),
  snapshots: t.Array(imageSnapshotExport, { maxItems: 200 }),
});
export type SessionSnapshot = Static<typeof sessionSnapshot>;

export const importPayloadChecker = TypeCompiler.Compile(
  t.Union([imageSnapshotExport, sessionSnapshot]),
);

export const imageParamsChecker = TypeCompiler.Compile(imageParams);
export const imageLorasChecker = TypeCompiler.Compile(
  t.Array(imageLoraEntry, { maxItems: 12 }),
);
export const imageReferencesChecker = TypeCompiler.Compile(
  t.Array(imageReferenceEntry, { maxItems: 6 }),
);

export const generatedImage = t.Object({
  resultUrl: t.Union([t.String(), t.Null()]),
  base64: t.String(),
  mimeType: t.String(),
  sizeBytes: t.Integer(),
  // Probed from the delivered bytes, not echoed from the request.
  width: t.Union([t.Integer(), t.Null()]),
  height: t.Union([t.Integer(), t.Null()]),
  seed: t.Optional(t.Integer()),
});
export type GeneratedImage = Static<typeof generatedImage>;

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
  heroImage: t.Union([t.String(), t.Null()]),
  defaultWeight: t.Number(),
  nsfwLevel: t.Union([t.Integer(), t.Null()]),
  // A LoRA gated behind a trigger word does nothing until that word is in the
  // prompt.
  triggerWords: t.Union([t.String(), t.Null()]),
  tags: t.Array(t.String()),
  downloadCount: t.Union([t.Integer(), t.Null()]),
});
export type CatalogItem = Static<typeof catalogItem>;
