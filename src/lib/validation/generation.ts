import type { Static } from "elysia";
import { t } from "elysia";

// Open string. The catalog is upstream-driven via /api/pricing now; the
// 5 ComfyUI templates plus any image model with metadata.maxImageInputs
// >= 6 are valid. Server-side assertGenerationModelAllowed checks the
// pricing cache before submit.
export const generationModel = t.String({ minLength: 1, maxLength: 128 });
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

// Mode determines which sub-graph the ComfyUI worker runs and which
// extra fields are required:
//   txt2img    -> no init image, default
//   img2img    -> initImageUrl required, denoise drives the strength
//   upscale    -> initImageUrl required, no diffusion (or low denoise)
//   adetailer  -> initImageUrl required, runs YOLO + inpaint on detections
//   inpaint    -> initImageUrl + maskUrl required, brush mask drives the region
//   edit       -> single or multi reference, model-family specific (Kontext etc.)
export const generationMode = t.Union([
  t.Literal("txt2img"),
  t.Literal("img2img"),
  t.Literal("upscale"),
  t.Literal("adetailer"),
  t.Literal("inpaint"),
  t.Literal("edit"),
]);
export type GenerationMode = Static<typeof generationMode>;

// ADetailer subform. Bound to a single YOLO detector + its own inpaint
// pass. LoRA chain here is independent of the main LoRA list because
// face-fixer models often want a face-specific LoRA the main pass shouldn't.
export const generationAdetailer = t.Object({
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
export type GenerationAdetailer = Static<typeof generationAdetailer>;

// ControlNet unit. Single-unit only on the SDXL Z-Image style we expose;
// preprocessor selection is implicit by `kind` (Depth/Canny/Openpose
// each have their own preprocessor wired into the ComfyUI template).
export const generationControlNetKind = t.Union([
  t.Literal("depth"),
  t.Literal("canny"),
  t.Literal("openpose"),
]);

export const generationControlNet = t.Object({
  kind: generationControlNetKind,
  imageUrl: t.String({ format: "uri", maxLength: 2048 }),
  weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
});
export type GenerationControlNet = Static<typeof generationControlNet>;

// Layer Diffusion: transparent PNG output via the LayerDiffusion custom
// nodes. Weight drives the alpha-leak slider; the ComfyUI template
// branches the VAE decode + saves a PNG with alpha when enabled.
export const generationLayerDiffusion = t.Object({
  weight: t.Number({ minimum: 0, maximum: 2 }),
});

// Per-call params shared across families. Optional fields mean "use the
// template default for the chosen model". The server merges these against
// MODEL_CAPABILITIES defaults before the upstream call.
export const generationParams = t.Object({
  // Width/height max 5060 to support the studio's custom-aspect range.
  // Per-model descriptors gate this further: Flux 2
  // is locked to 1024x1024 by its template, SDXL still aborts >2048 inside
  // the ComfyUI worker (worker VRAM). Validate broadly here; the
  // descriptor + adapter narrow.
  width: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
  height: t.Optional(t.Integer({ minimum: 64, maximum: 5060 })),
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
  // Sync-image vendor knobs. Each is forwarded by the dispatch layer to
  // the right field on the upstream body shape (see generation-dispatch.ts).
  // Only relevant for the "sync-image" family; ComfyUI ignores them.
  quality: t.Optional(t.String({ maxLength: 32 })),
  outputFormat: t.Optional(t.String({ maxLength: 16 })),
  watermark: t.Optional(t.Boolean()),
  background: t.Optional(t.String({ maxLength: 32 })),
  strength: t.Optional(t.Number({ minimum: 0, maximum: 1 })),
  // ---- studio power-user knobs ----
  // Inpaint / Img2Img / Upscale init image + mask
  initImageUrl: t.Optional(t.String({ format: "uri", maxLength: 2048 })),
  maskUrl: t.Optional(t.String({ format: "uri", maxLength: 2048 })),
  // VAE override (filename on the RunPod volume; "Automatic" / "None" skip)
  vae: t.Optional(t.String({ maxLength: 128 })),
  // Upscaler model name (one of the 18 upscalers on the volume). When
  // present the worker uses it instead of the template default and
  // skips its built-in latent-upscale path.
  upscaler: t.Optional(t.String({ maxLength: 128 })),
  // Multiplier on top of upscaler. Tensor uses discrete radios
  // (1x/1.5x/2x/3x/4x/custom); we accept any float in range and clamp
  // worker-side.
  upscalerMultiplier: t.Optional(t.Number({ minimum: 1, maximum: 4 })),
  hiresSteps: t.Optional(t.Integer({ minimum: 1, maximum: 80 })),
  // Embeddings to inject into the prompt as `embedding:<name>:weight`
  // tokens; the prompt-assembler in the worker rewrites these into the
  // expected ComfyUI CLIPTextEncode syntax.
  embeddings: t.Optional(
    t.Array(
      t.Object({
        name: t.String({ maxLength: 256 }),
        weight: t.Optional(t.Number({ minimum: 0, maximum: 2 })),
      }),
      { maxItems: 6 },
    ),
  ),
  // ControlNet unit (single-unit only). Image rehosted through R2 first.
  controlNet: t.Optional(generationControlNet),
  // ADetailer subform. When present, the worker fires a 2nd-pass after
  // the main diffusion.
  adetailer: t.Optional(generationAdetailer),
  // Layer Diffusion transparent-output. When present the result image
  // is saved as PNG with alpha and stored in R2 with the same key suffix.
  layerDiffusion: t.Optional(generationLayerDiffusion),
  // SDXL-family Advanced Settings. Other families ignore both.
  clipSkip: t.Optional(t.Integer({ minimum: 0, maximum: 12 })),
  ensd: t.Optional(t.Integer({ minimum: 0, maximum: 4_294_967_295 })),
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
// shaped request to upstream new-api. One row per submit; N images per
// row are produced by `params.n` (clamped to [1, 4] server-side).
// UI-only state held on the form but stripped before submit. Lives next
// to the wire schema so RHF can validate both shapes against one resolver.
// Stripped by `toSubmitBody` in components/pages/sidebar/generate/form/submit-transform.ts.
export const generationFormUi = t.Object({
  // Variants is a UI selector translated into `params.n` by the submit transform.
  variants: t.Optional(t.Integer({ minimum: 1, maximum: 4 })),
  // Inpaint canvas writes a PNG data URL here; submit uploads to R2 and
  // threads the URL into params.maskUrl.
  inpaintMaskDataUrl: t.Optional(t.String()),
  // Brush controls (UI only).
  inpaintBrushSize: t.Optional(t.Integer({ minimum: 4, maximum: 128 })),
  inpaintBrushOpacity: t.Optional(t.Number({ minimum: 0.05, maximum: 1 })),
});
export type GenerationFormUi = Static<typeof generationFormUi>;

export const generationSubmitBody = t.Object({
  model: generationModel,
  // Mode is optional: legacy clients send no `mode` and the server
  // treats them as txt2img. The studio sets this explicitly per top-tab
  // + Img2Img sub-pill.
  mode: t.Optional(generationMode),
  prompt: t.String({ minLength: 1, maxLength: 8000 }),
  negativePrompt: t.Optional(t.String({ maxLength: 4000 })),
  params: t.Optional(generationParams),
  loras: t.Optional(t.Array(generationLoraEntry, { maxItems: 12 })),
  references: t.Optional(t.Array(generationReferenceEntry, { maxItems: 6 })),
  // Free-form spillover for per-model knobs (Flux guidance is just a CFG
  // alias today, but future models may add new fields).
  extraParams: t.Optional(t.Record(t.String(), t.Any())),
  // Initial visibility. Owner can flip later via /visibility.
  visibility: t.Optional(generationVisibility),
  // NSFW marker on the row. Default true (catalog is NSFW-capable).
  nsfw: t.Optional(t.Boolean()),
  // Append this snapshot to an existing session the user owns. Absent
  // means "start a new session"; the server creates one and uses its id.
  sessionId: t.Optional(t.String({ maxLength: 64 })),
});
export type GenerationSubmitBody = Static<typeof generationSubmitBody>;

// The shape RHF works with: wire body + UI-only `ui` slot. The submit
// transform strips `ui` and applies its effects (variants -> params.n,
// inpaintMaskDataUrl -> uploaded -> params.maskUrl).
export const generationFormValues = t.Composite([
  generationSubmitBody,
  t.Object({ ui: t.Optional(generationFormUi) }),
]);
export type GenerationFormValues = Static<typeof generationFormValues>;

// History query (paginated). Uses cursor-style pagination keyed by
// createdAt (descending) to keep page changes stable as new rows arrive.
export const generationHistoryQuery = t.Object({
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  cursor: t.Optional(t.String({ maxLength: 64 })),
  // Filter by model (used by per-model browse).
  model: t.Optional(generationModel),
});
export type GenerationHistoryQuery = Static<typeof generationHistoryQuery>;

// Clone-mode for share-fork and import:
//   restore    = recreate the row with the original images re-hosted (no upstream call)
//   regenerate = fire a fresh upstream submission using the same prompt+params
export const generationCloneMode = t.Union([
  t.Literal("restore"),
  t.Literal("regenerate"),
]);
export type GenerationCloneMode = Static<typeof generationCloneMode>;

// Snapshot of a generation row + its images. Same shape exportGeneration
// emits; the import route accepts this verbatim. Loose typing on the
// nested fields (params, loras, refs, extraParams) so a slightly-older
// export with extra keys still parses.
export const generationSnapshot = t.Object({
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
export type GenerationSnapshot = Static<typeof generationSnapshot>;

// Snapshot of a whole session: every iteration plus metadata. Used by
// session export / import. Snapshots are stored in their original order
// (oldest first) so a restore preserves the same sessionOrder layout.
export const sessionSnapshot = t.Object({
  version: t.Literal("unorouter-session-1"),
  session: t.Object({
    title: t.Union([t.String({ maxLength: 256 }), t.Null()]),
    firstModel: t.Union([t.String({ maxLength: 128 }), t.Null()]),
  }),
  snapshots: t.Array(generationSnapshot, { maxItems: 200 }),
});
export type SessionSnapshot = Static<typeof sessionSnapshot>;

// Import body accepts either shape. Eden / TypeBox unions just dispatch
// on the `version` literal.
export const generationImportBody = t.Object({
  payload: t.Union([generationSnapshot, sessionSnapshot]),
  mode: generationCloneMode,
});

export const generationCloneFromShareBody = t.Object({
  mode: generationCloneMode,
});

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

// ---------------------------------------------------------------------------
// Catalog queries for the embedding / upscaler / controlnet pickers. Same
// shape as loraCatalog so picker UI can share components: filter by
// base-model family + an optional category facet. Category enums differ
// per catalog; the validator is forgiving so the worker can add new
// categories without a schema bump.
// ---------------------------------------------------------------------------

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
  // Upscalers are family-agnostic on the volume; the field is here for
  // future-proofing and the worker passes whichever was selected through.
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

// Mask upload body. Browser draws an inpaint mask on canvas, encodes to
// PNG via toBlob, sends as multipart. Same allowed types as references
// minus webp (the worker expects PNG/JPEG for the mask sub-graph).
export const generationMaskUploadBody = t.Object({
  file: t.File({
    maxSize: "10m",
    type: ["image/png", "image/jpeg"],
  }),
});
