import type { ImageParams, PricingCatalogModel } from "@/openapi";
import type { ImageModelId } from "@/lib/validation/image";

// The gateway's imageParams verbatim (which controls the model accepts, resolved
// from the provider schema) plus the unorouter-only view state a form needs.
export type ImageModelDescriptor = PricingCatalogModel &
  Partial<ImageParams> & {
    model_name: ImageModelId;
    supportsSize: boolean;
    supportsReferences: boolean;
    defaultParams: {
      width: number;
      height: number;
      steps: number;
      cfg?: number;
      guidance?: number;
      // Plain strings: the names belong to whichever backend serves the model, and
      // samplers says which ones it accepts.
      sampler?: string;
      scheduler?: string;
    };
    fixedSize?: { width: number; height: number };
    schedulers?: string[];
    // Checkpoint-only controls, set by the form's own AIR lookup rather than the
    // catalog: a user picks these at generation time.
    supportsEmbedding?: boolean;
    supportsVae?: boolean;
    supportsClipSkip?: boolean;
    tabs?: ReadonlyArray<"text2img" | "img2img" | "edit">;
  };

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
    supportsSize: true,
    supportsReferences: false,
    defaultParams: { width: 1024, height: 1024, steps: 20 },
  };
}
