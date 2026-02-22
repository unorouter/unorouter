const API_BASE = "https://api.unorouter.ai";

export type PricingModel = {
  model_name: string;
  vendor_id: number;
  quota_type: number;
  model_ratio: number;
  model_price: number;
  completion_ratio: number;
  enable_groups: string[];
  supported_endpoint_types: string[];
  owner_by: string;
  pricing_version: string;
};

export type Vendor = {
  id: number;
  name: string;
  icon?: string;
};

export type SupportedEndpoint = {
  path: string;
  method: string;
};

export type PricingResponse = {
  success: boolean;
  data: PricingModel[];
  vendors: Vendor[];
  group_ratio: Record<string, number>;
  supported_endpoint: Record<string, SupportedEndpoint>;
  usable_group: string[];
  auto_groups: string[];
  show_original_price: boolean;
};

export type ModelType = "llm" | "vision" | "image" | "video";

export type ProcessedModel = {
  name: string;
  vendor: Vendor;
  inputPrice: number;
  outputPrice: number;
  fixedPrice: number;
  isFixedPrice: boolean;
  types: ModelType[];
  endpointTypes: string[];
};

const VISION_KEYWORDS = ["vision", "vl", "4o", "image"];

function inferModelTypes(model: PricingModel): ModelType[] {
  const types: ModelType[] = [];
  const endpoints = model.supported_endpoint_types;
  const name = model.model_name.toLowerCase();

  if (endpoints.includes("image-generation")) {
    types.push("image");
  }
  if (endpoints.includes("openai-video")) {
    types.push("video");
  }
  if (
    endpoints.includes("openai") ||
    endpoints.includes("anthropic") ||
    endpoints.includes("gemini")
  ) {
    types.push("llm");
  }
  if (VISION_KEYWORDS.some((kw) => name.includes(kw))) {
    types.push("vision");
  }

  return types.length > 0 ? types : ["llm"];
}

function getMinGroupRatio(groupRatio: Record<string, number>): number {
  const publicGroups = Object.entries(groupRatio).filter(
    ([key]) => !key.includes("priv") && !key.includes("sub2api")
  );
  if (publicGroups.length === 0) return 1;
  return Math.min(...publicGroups.map(([, ratio]) => ratio));
}

export function processModels(response: PricingResponse): ProcessedModel[] {
  const vendorMap = new Map(response.vendors.map((v) => [v.id, v]));
  const minRatio = getMinGroupRatio(response.group_ratio);

  return response.data
    .map((model) => {
      const vendor = vendorMap.get(model.vendor_id) ?? {
        id: model.vendor_id,
        name: "Unknown",
      };
      const isFixedPrice = model.quota_type === 1;

      let inputPrice = 0;
      let outputPrice = 0;
      let fixedPrice = 0;

      if (isFixedPrice) {
        fixedPrice = model.model_price;
      } else {
        inputPrice = model.model_ratio * 2 * minRatio;
        outputPrice = inputPrice * model.completion_ratio;
      }

      return {
        name: model.model_name,
        vendor,
        inputPrice,
        outputPrice,
        fixedPrice,
        isFixedPrice,
        types: inferModelTypes(model),
        endpointTypes: model.supported_endpoint_types,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchPricing(): Promise<PricingResponse> {
  const res = await fetch(`${API_BASE}/api/pricing`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Pricing API error: ${res.status}`);
  return res.json();
}

export async function getProcessedModels(): Promise<ProcessedModel[]> {
  const pricing = await fetchPricing();
  return processModels(pricing);
}
