import type { PricingData, PricingDataDataItem } from "@/openapi";

const MODEL_TYPES = ["text", "image", "video", "audio", "embedding"] as const;
export type ModelType = (typeof MODEL_TYPES)[number];

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
  const showOriginalPrice = response.show_original_price ?? false;

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
      let originalInputPrice: number | null = null;
      let originalOutputPrice: number | null = null;

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

        // Original price (groupRatio=1) for strikethrough display when discounted
        if (showOriginalPrice && minRatio < 1) {
          originalInputPrice = (model.model_ratio ?? 0) * 2;
          originalOutputPrice =
            originalInputPrice * (model.completion_ratio ?? 0);
        }
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
        isFree: isFixedPrice
          ? fixedPrice === 0
          : inputPrice === 0 && outputPrice === 0,
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
        originalInputPrice,
        originalOutputPrice,
      };
    })
    .sort((a, b) => {
      // Free models first, then alphabetical
      if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export function buildPricingSummary(response: PricingData) {
  const models = processModels(response);
  const endpointMap = (response.supported_endpoint ?? {}) as Record<
    string,
    EndpointInfo
  >;

  // Group by vendor (for pricing page vendor cards)
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

  // Group by type tag (for chat model selector)
  const modelsByType: { tag: string; models: ProcessedModel[] }[] = [];
  const typeMap = new Map<string, ProcessedModel[]>();
  for (const model of models) {
    const tag = model.tags[0] ?? "Other";
    const list = typeMap.get(tag);
    if (list) list.push(model);
    else typeMap.set(tag, [model]);
  }
  for (const [tag, tagModels] of typeMap) {
    modelsByType.push({ tag, models: tagModels });
  }

  // First free model (prefers text type)
  const firstFreeModel =
    models.find((m) => m.isFree && m.type === "text") ??
    models.find((m) => m.isFree) ??
    null;

  const vendorNames = [...new Set(models.map((m) => m.vendor.name))].sort(
    (a, b) => a.localeCompare(b),
  );

  // Most expensive discounted text model per vendor (for badge/pricing use)
  const discountedByVendor = new Map<string, ProcessedModel>();
  for (const m of models) {
    if (
      m.type !== "text" ||
      m.isFixedPrice ||
      m.inputPrice <= 0 ||
      m.originalInputPrice === null
    )
      continue;
    const existing = discountedByVendor.get(m.vendor.name);
    if (!existing || m.inputPrice > existing.inputPrice) {
      discountedByVendor.set(m.vendor.name, m);
    }
  }
  const topDiscounted = [...discountedByVendor.values()]
    .sort((a, b) => {
      const discA = 1 - a.inputPrice / (a.originalInputPrice ?? a.inputPrice);
      const discB = 1 - b.inputPrice / (b.originalInputPrice ?? b.inputPrice);
      return discB - discA;
    })
    .slice(0, 4)
    .map((m) => ({
      model: m.name,
      vendor: m.vendor.name,
      inputPrice: m.inputPrice,
      outputPrice: m.outputPrice,
      originalInputPrice: m.originalInputPrice,
      originalOutputPrice: m.originalOutputPrice,
    }));

  return {
    modelCount: models.length,
    vendorCount: vendors.length,
    models,
    vendors,
    vendorNames,
    modelsByType,
    firstFreeModel,
    endpointMap,
    groupRatioMap: response.group_ratio ?? {},
    topDiscounted,
  };
}

export function findSimilarModels(
  all: ProcessedModel[],
  current: ProcessedModel,
  limit = 6,
): { sameVendor: ProcessedModel[]; sameTag: ProcessedModel[] } {
  const others = all.filter((m) => m.name !== current.name);

  const sameVendor = others
    .filter((m) => m.vendor.id === current.vendor.id)
    .slice(0, 3);

  const currentTags = new Set(current.tags ?? []);
  const sameTag = others
    .filter(
      (m) =>
        m.vendor.id !== current.vendor.id &&
        (m.tags ?? []).some((t) => currentTags.has(t)),
    )
    .slice(0, limit - sameVendor.length);

  return { sameVendor, sameTag };
}

export function findContextTag(model: ProcessedModel): string | undefined {
  return (model.tags ?? []).find((tag) => /\d+K$|\d+\.\d+K$/.test(tag));
}

