import type { PricingData, PricingDataDataItem } from "@/openapi";

export type ModelType = "llm" | "vision" | "image" | "video";

const VISION_KEYWORDS = ["vision", "vl", "4o", "image"];

function inferModelTypes(model: PricingDataDataItem): ModelType[] {
  const types: ModelType[] = [];
  const endpoints = model.supported_endpoint_types ?? [];
  const name = (model.model_name ?? "").toLowerCase();

  if (endpoints.includes("image-generation")) types.push("image");
  if (endpoints.includes("openai-video")) types.push("video");
  if (
    endpoints.includes("openai") ||
    endpoints.includes("anthropic") ||
    endpoints.includes("gemini")
  ) {
    types.push("llm");
  }
  if (VISION_KEYWORDS.some((kw) => name.includes(kw))) types.push("vision");

  return types.length > 0 ? types : ["llm"];
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
