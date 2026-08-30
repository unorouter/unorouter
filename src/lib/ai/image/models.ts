import type { ImageParams, PricingCatalogModel } from "@/openapi";
import type { ImageModelId } from "@/lib/validation/image";

export type ImageModelDescriptor = PricingCatalogModel & {
  model_name: ImageModelId;
};

export function imageParams(m: ImageModelDescriptor): Partial<ImageParams> {
  return m.metadata?.imageParams ?? {};
}

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

// An unresolved id must borrow NOTHING but the shape: inherited capability flags
// render another model's controls while the request runs this one.
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
