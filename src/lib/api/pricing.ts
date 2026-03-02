import type { PricingData, PricingDataDataItem } from "@/openapi";

export type ModelType = "text" | "image" | "video" | "audio" | "embedding";

// Mirrors new-api-sync's ENDPOINT_TO_MODEL_TYPE mapping
const ENDPOINT_TO_MODEL_TYPE: Record<string, ModelType> = {
  "image-generation": "image",
  "dall-e-3": "image",
  "aigc-image": "image",
  "openai-video": "video",
  "aigc-video": "video",
  embeddings: "embedding",
  embedding: "embedding",
  rerank: "embedding",
  "jina-rerank": "embedding",
  geminitts: "audio",
};

const ENDPOINT_KEYWORD_TYPES: [string, ModelType][] = [
  ["video", "video"],
  ["image", "image"],
  ["tts", "audio"],
];

const TEXT_ENDPOINT_TYPES = new Set([
  "openai",
  "anthropic",
  "gemini",
  "openai-response",
  "openai-response-compact",
]);

function inferModelTypes(model: PricingDataDataItem): ModelType[] {
  const endpoints = model.supported_endpoint_types ?? [];
  const types = new Set<ModelType>();

  for (const ep of endpoints) {
    const exact = ENDPOINT_TO_MODEL_TYPE[ep];
    if (exact) {
      types.add(exact);
      continue;
    }
    if (TEXT_ENDPOINT_TYPES.has(ep)) {
      types.add("text");
      continue;
    }
    const lower = ep.toLowerCase();
    for (const [keyword, type] of ENDPOINT_KEYWORD_TYPES) {
      if (lower.includes(keyword)) {
        types.add(type);
        break;
      }
    }
  }

  return types.size > 0 ? [...types] : ["text"];
}

function getMinGroupRatio(groupRatio: Record<string, number>): number {
  const publicGroups = Object.entries(groupRatio).filter(
    ([key]) => !key.includes("priv") && !key.includes("sub2api"),
  );
  if (publicGroups.length === 0) return 1;
  return Math.min(...publicGroups.map(([, ratio]) => ratio));
}

export function processModels(response: PricingData) {
  const vendors = response.vendors ?? [];
  const data = response.data ?? [];
  const groupRatio = response.group_ratio ?? {};

  const vendorMap = new Map(vendors.map((v) => [v.id, v]));
  const minRatio = getMinGroupRatio(groupRatio);

  return data
    .map((model) => {
      const vendorId = model.vendor_id ?? undefined;
      const raw = vendorMap.get(vendorId);
      const vendor = {
        id: raw?.id ?? vendorId ?? 0,
        name: raw?.name ?? "Unknown",
        icon: raw?.icon,
      };
      const isFixedPrice = model.quota_type === 1;

      let inputPrice = 0;
      let outputPrice = 0;
      let fixedPrice = 0;

      if (isFixedPrice) {
        fixedPrice = model.model_price ?? 0;
      } else {
        inputPrice = (model.model_ratio ?? 0) * 2 * minRatio;
        outputPrice = inputPrice * (model.completion_ratio ?? 0);
      }

      return {
        name: model.model_name ?? "",
        vendor,
        inputPrice,
        outputPrice,
        fixedPrice,
        isFixedPrice,
        types: inferModelTypes(model),
        endpointTypes: model.supported_endpoint_types ?? [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
