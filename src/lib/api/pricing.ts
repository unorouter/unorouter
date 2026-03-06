import type { PricingData, PricingDataDataItem } from "@/openapi";

export type ModelType = "text" | "image" | "video" | "audio" | "embedding";

const VALID_MODEL_TYPES = new Set<string>([
  "text",
  "image",
  "video",
  "audio",
  "embedding",
]);

function getModelType(model: PricingDataDataItem): ModelType {
  const tag = (model.tags ?? "").split(",")[0]?.trim().toLowerCase();
  return VALID_MODEL_TYPES.has(tag) ? (tag as ModelType) : "text";
}

export function processModels(response: PricingData) {
  const vendors = response.vendors ?? [];
  const data = response.data ?? [];
  const groupRatio = response.group_ratio ?? {};

  const vendorMap = new Map(vendors.map((v) => [v.id, v]));
  const ratios = Object.values(groupRatio);
  const minRatio = ratios.length > 0 ? Math.min(...ratios) : 1;

  return data
    .map((model) => {
      const vendorId = model.vendor_id ?? undefined;
      const raw = vendorMap.get(vendorId!);
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
        type: getModelType(model),
        endpointTypes: model.supported_endpoint_types ?? [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
