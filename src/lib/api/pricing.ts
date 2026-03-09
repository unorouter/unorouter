import type { PricingData, PricingDataDataItem } from "@/openapi";

export type ModelType = "text" | "image" | "video" | "audio" | "embedding";

export type ProcessedModel = {
  name: string;
  vendor: { id: number; name: string; icon: string | undefined };
  inputPrice: number;
  outputPrice: number;
  fixedPrice: number;
  isFixedPrice: boolean;
  type: ModelType;
  endpointTypes: string[];
  description: string | undefined;
  tags: string[];
  modelRatio: number;
  completionRatio: number;
  enableGroups: string[];
};

export type VendorSummary = {
  id: number;
  name: string;
  icon: string | undefined;
  modelCount: number;
  models: ProcessedModel[];
};

export type EndpointInfo = {
  method: string;
  path: string;
};

export type PricingSummary = {
  modelCount: number;
  vendorCount: number;
  models: ProcessedModel[];
  vendors: VendorSummary[];
  endpointMap: Record<string, EndpointInfo>;
  groupRatioMap: Record<string, number>;
};

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

function processModels(response: PricingData) {
  const vendors = response.vendors ?? [];
  const data = response.data ?? [];
  const groupRatio = response.group_ratio ?? {};

  const vendorMap = new Map(vendors.map((v) => [v.id, v]));

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
        const enabledGroups = model.enable_groups ?? [];
        let minRatio = 1;
        if (enabledGroups.length > 0) {
          let min = Number.POSITIVE_INFINITY;
          for (const g of enabledGroups) {
            const r = groupRatio[g];
            if (r !== undefined && r < min) min = r;
          }
          if (min !== Number.POSITIVE_INFINITY) minRatio = min;
        }
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
        description: model.description,
        tags: (model.tags ?? "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        modelRatio: model.model_ratio ?? 0,
        completionRatio: model.completion_ratio ?? 0,
        enableGroups: model.enable_groups ?? [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function buildPricingSummary(response: PricingData): PricingSummary {
  const models = processModels(response);
  const endpointMap = (response.supported_endpoint ?? {}) as Record<
    string,
    EndpointInfo
  >;

  const vendorGroups = new Map<
    string,
    { vendor: ProcessedModel["vendor"]; models: ProcessedModel[] }
  >();
  for (const model of models) {
    const key = model.vendor.name;
    const group = vendorGroups.get(key);
    if (group) {
      group.models.push(model);
    } else {
      vendorGroups.set(key, { vendor: model.vendor, models: [model] });
    }
  }

  const vendors = [...vendorGroups.values()]
    .map((g) => {
      const textModels = g.models.filter((m) => m.type === "text");
      return {
        ...g.vendor,
        modelCount: g.models.length,
        models: textModels
          .sort((a, b) => b.name.localeCompare(a.name))
          .slice(0, 3),
      };
    })
    .sort((a, b) => b.modelCount - a.modelCount);

  return {
    modelCount: models.length,
    vendorCount: vendors.length,
    models,
    vendors,
    endpointMap,
    groupRatioMap: response.group_ratio ?? {},
  };
}
