import type { PricingData, PricingDataDataItem } from "@/openapi";

const MODEL_TYPES = ["text", "image", "video", "audio", "embedding"] as const;
type ModelType = (typeof MODEL_TYPES)[number];

export type GridPricingRow = Record<string, string | number>;

export type EndpointInfo = {
  method: string;
  path: string;
};

export type ProcessedModel = ReturnType<typeof processModels>[number];
export type PricingSummary = ReturnType<typeof buildPricingSummary>;

function getModelType(model: PricingDataDataItem): ModelType {
  const tag = (model.tags ?? "").split(",")[0]?.trim().toLowerCase();
  return (MODEL_TYPES as readonly string[]).includes(tag)
    ? (tag as ModelType)
    : "text";
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
      const qt = model.quota_type ?? 0;
      // Types 1 (fixed price), 3 (custom billing), 4 (grid pricing) all use model_price
      const isFixedPrice = qt === 1 || qt === 3 || qt === 4;

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

      const rawGrid = model.grid_pricing as GridPricingRow[] | null | undefined;
      const gridPricing =
        Array.isArray(rawGrid) && rawGrid.length > 0 ? rawGrid : null;

      return {
        name: model.model_name ?? "",
        vendor,
        inputPrice,
        outputPrice,
        fixedPrice,
        isFixedPrice,
        quotaType: qt,
        gridPricing,
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

export function buildPricingSummary(response: PricingData) {
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
      const displayModels = textModels.length > 0 ? textModels : g.models;
      return {
        ...g.vendor,
        modelCount: g.models.length,
        models: displayModels
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
