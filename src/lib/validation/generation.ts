import type { Static } from "elysia";
import { t } from "elysia";

// Mirror new-api's catalog. Update when a model is added/removed there.
export const generationModel = t.Union([
  t.Literal("pony"),
  t.Literal("endgame"),
  t.Literal("comfyui-sdxl-txt2img-lora"),
  t.Literal("flux2-dev"),
  t.Literal("flux2-dev-compose"),
]);
export type GenerationModel = Static<typeof generationModel>;

export const generationVisibility = t.Union([
  t.Literal("private"),
  t.Literal("unlisted"),
  t.Literal("public"),
]);
export type GenerationVisibility = Static<typeof generationVisibility>;

export const generationStatus = t.Union([
  t.Literal("pending"),
  t.Literal("submitted"),
  t.Literal("queued"),
  t.Literal("in_progress"),
  t.Literal("success"),
  t.Literal("failure"),
]);
export type GenerationStatus = Static<typeof generationStatus>;

// SDXL family samplers (subset of ComfyUI's KSampler list). Flux 2 graph
// uses KSamplerSelect with a different naming, but for our exposed API
// the SDXL models are what take a sampler choice.
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

// Sizes our SDXL templates support out of the box. Flux 2 is locked to
// 1024x1024 by the template (memory edge case 8) and the form should
// hide the size picker for that family entirely.
export const generationSize = t.Union([
  t.Literal("1024x1024"),
  t.Literal("832x1216"),
  t.Literal("1216x832"),
  t.Literal("1024x1536"),
  t.Literal("1536x1024"),
]);

// Per-call params shared across families. Optional fields mean "use the
// template default for the chosen model". The server merges these against
// MODEL_CAPABILITIES defaults before the upstream call.
export const generationParams = t.Object({
  width: t.Optional(t.Integer({ minimum: 64, maximum: 2048 })),
  height: t.Optional(t.Integer({ minimum: 64, maximum: 2048 })),
  steps: t.Optional(t.Integer({ minimum: 1, maximum: 80 })),
  cfg: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  guidance: t.Optional(t.Number({ minimum: 0, maximum: 20 })),
  sampler: t.Optional(generationSampler),
  scheduler: t.Optional(generationScheduler),
  // Empty seed = template default's auto_random fires at adapter side.
  seed: t.Optional(t.Integer({ minimum: 0, maximum: 4_294_967_295 })),
  denoise: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  // Hires fix: when present, the adapter feeds the values into the
  // SDXL template's hires_denoise / hires_upscale params. Skipped on
  // Flux 2 (template doesn't expose them and the form hides the
  // toggle for the flux2 family).
  hiresDenoise: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  hiresUpscale: t.Optional(t.Number({ minimum: 1, maximum: 4 })),
  // Worker-comfyui caps batch_size at 4 inside the adapter.
  n: t.Optional(t.Integer({ minimum: 1, maximum: 4 })),
});
export type GenerationParams = Static<typeof generationParams>;

// One LoRA picked from loraCatalog. `source` is informational; the picker
// resolves to a catalog row server-side. v1 only forwards `name` (the
// filename on the volume) and `weight` to the upstream adapter.
export const generationLoraEntry = t.Object({
  name: t.String({ maxLength: 256 }),
  weight: t.Number({ minimum: 0, maximum: 2 }),
  source: t.Optional(t.String({ maxLength: 64 })),
});

// One reference image. URL is the canonical form (R2-hosted preferred so
// the upstream-side fetch from new-api succeeds; arbitrary public URLs
// also work as long as they don't reject server-IP fetches like Wikimedia
// does). Name + weight are advisory; weight currently isn't wired to the
// stock ReferenceLatent node (template's WeightInput is empty).
export const generationReferenceEntry = t.Object({
  url: t.String({ format: "uri", maxLength: 2048 }),
  name: t.Optional(t.String({ maxLength: 200 })),
  weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
});

// Submit body. The server creates a `pending` row first, then forwards a
// shaped request to upstream new-api. A single submit makes one row; the
// client makes N parallel calls when variants > 1, sharing one batchId.
export const generationSubmitBody = t.Object({
  model: generationModel,
  prompt: t.String({ minLength: 1, maxLength: 8000 }),
  negativePrompt: t.Optional(t.String({ maxLength: 4000 })),
  params: t.Optional(generationParams),
  loras: t.Optional(t.Array(generationLoraEntry, { maxItems: 12 })),
  references: t.Optional(t.Array(generationReferenceEntry, { maxItems: 6 })),
  // Free-form spillover for per-model knobs (Flux guidance is just a CFG
  // alias today, but future models may add new fields).
  extraParams: t.Optional(t.Record(t.String(), t.Any())),
  // Optional; client supplies when batching. Server generates one if absent.
  batchId: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
  // Position within the batch; 0-based. Defaults to 0 server-side.
  variantIndex: t.Optional(t.Integer({ minimum: 0, maximum: 7 })),
  // Initial visibility. Owner can flip later via /visibility.
  visibility: t.Optional(generationVisibility),
  // NSFW marker on the row. Default true (catalog is NSFW-capable).
  nsfw: t.Optional(t.Boolean()),
});
export type GenerationSubmitBody = Static<typeof generationSubmitBody>;

// History query (paginated). Uses cursor-style pagination keyed by
// createdAt (descending) to keep page changes stable as new rows arrive.
export const generationHistoryQuery = t.Object({
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  cursor: t.Optional(t.String({ maxLength: 64 })),
  // Filter to one batch (used by the result-grid view).
  batchId: t.Optional(t.String({ maxLength: 32 })),
  // Filter by model (used by per-model browse).
  model: t.Optional(generationModel),
});
export type GenerationHistoryQuery = Static<typeof generationHistoryQuery>;

export const generationVisibilityBody = t.Object({
  visibility: generationVisibility,
});

// Reference upload body. The R2 endpoint accepts a single image and
// returns the public R2 URL the form should hand to references[].url.
// Multipart so the browser can upload the binary directly instead of
// round-tripping through base64 in JSON.
export const generationReferenceUploadBody = t.Object({
  file: t.File({
    maxSize: "10m",
    type: ["image/png", "image/jpeg", "image/webp"],
  }),
});

// LoRA catalog query. Picker filters by the selected model's family;
// optional category facet for the search/filter UI.
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
