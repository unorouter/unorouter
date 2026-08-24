import type { ImageParams, PricingCatalogModel } from "@/openapi";
import type { ImageModelId } from "@/lib/validation/image";

// The catalog row as the gateway sends it. Generation controls live on
// metadata.imageParams; the extras below exist only for a user-picked checkpoint,
// which is resolved in the form at generation time and never by the catalog.
export type ImageModelDescriptor = PricingCatalogModel & {
  model_name: ImageModelId;
  supportsEmbedding?: boolean;
  supportsVae?: boolean;
  supportsClipSkip?: boolean;
  tabs?: ReadonlyArray<"text2img" | "img2img" | "edit">;
};

/** Generation controls, empty when the model resolves none. */
export function imageParams(m: ImageModelDescriptor): Partial<ImageParams> {
  return m.metadata?.imageParams ?? {};
}

/** What a form starts at, as the gateway resolved it for this model. */
export function defaultParams(m: ImageModelDescriptor) {
  const p = imageParams(m);
  const out: {
    width: number;
    height: number;
    steps: number;
    cfg: number | undefined;
    sampler: string;
    scheduler: string | undefined;
  } = {
    width: p.defaultWidth ?? 1024,
    height: p.defaultHeight ?? 1024,
    steps: p.defaultSteps ?? 20,
    cfg: p.defaultCfg ?? undefined,
    sampler: p.defaultSampler ?? "Default",
    scheduler: undefined,
  };
  return out;
}

// An id we cannot resolve borrows NOTHING but the shape: prompt and size are the
// only knobs every image model shares. Inheriting another model's capability
// flags renders that model's controls under a different name (an unresolved flux
// once showed the SDXL sampler and hid its own reference uploader, while the
// request still ran flux).
export function getModelDescriptor(id: ImageModelId): ImageModelDescriptor {
  return {
    model_name: id,
    vendor: "",
    vendor_id: 0,
    type: "image",
    tags: [],
    release_ts: 0,
    is_free: false,
    online: false,
    input_price: 0,
    output_price: 0,
    fixed_price: 0,
    is_fixed_price: false,
    chat: false,
    supported_endpoint_types: [],
    metadata: { releaseTs: 0 },
  };
}
