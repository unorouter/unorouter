import type { PricingData, PricingModel } from "@/openapi";

const MODEL_TYPES = ["text", "image", "video", "audio", "embedding"] as const;
export type ModelType = (typeof MODEL_TYPES)[number];

export type GridPricingRow = Record<string, string | number>;

export type EndpointInfo = {
  method: string;
  path: string;
};

// Per-model client hints from new-api-sync's models.metadata column, surfaced
// via /api/pricing. Mirrors SourceMetadata in new-api-sync core/pricing/sources/types.ts.
export type ModelMetadata = {
  maxInputTokens?: number;
  /** Required for thinking models (glm, kimi, qwen reasoning variants) whose
   *  reasoning_content phase eats the upstream budget before emitting visible
   *  content. */
  maxOutputTokens?: number;
  contextWindow?: number;
  isReasoning?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  supportsPdf?: boolean;
  supportsVideo?: boolean;
  supportsCache?: boolean;
  supportsResponseFormat?: boolean;
  supportsParallelTools?: boolean;
  supportsWebSearch?: boolean;
  supportsComputerUse?: boolean;
  inputModalities?: string[];
  outputModalities?: string[];
  maxImageInputs?: number;
  tokenizer?: string;
  knowledgeCutoff?: string;
  deprecationDate?: string;
  mode?: string;
  description?: string;

  /** Conservative intersection across all OR endpoints serving this model. */
  supportedParameters?: string[];
  /** Permissive union (for "expert mode" toggle). */
  supportedParametersAll?: string[];
  /** OR's recommended defaults; null = OR says "don't send". */
  defaultParameters?: Record<string, number | null>;

  reasoningEfforts?: ("none" | "minimal" | "low" | "medium" | "high" | "max")[];

  expirationDate?: string;
  isModerated?: boolean;
  huggingFaceId?: string;
  quantization?: string;

  supportsAssistantPrefill?: boolean;
  supportsCodeExecution?: boolean;
  supportsFileSearch?: boolean;
  supportsServiceTier?: boolean;
  supportsUrlContext?: boolean;
  supportsAudioOutput?: boolean;
  supportsNativeStreaming?: boolean;
  supportsNativeStructuredOutput?: boolean;
  supportsSystemMessages?: boolean;
};

export type ProcessedModel = ReturnType<typeof processModels>[number];

function getModelType(model: PricingModel): ModelType {
  const tag = (model.tags ?? "").split(",")[0]?.trim().toLowerCase();
  return (MODEL_TYPES as readonly string[]).includes(tag)
    ? (tag as ModelType)
    : "text";
}

function parseModelMetadata(raw: string | undefined): ModelMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ModelMetadata;
  } catch {
    // Malformed JSON from the sync: fall through to empty metadata.
  }
  return {};
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
      // Types 1 (fixed), 3 (custom billing), 4 (grid) all use model_price.
      const isFixedPrice = qt === 1 || qt === 3 || qt === 4;

      let inputPrice = 0;
      let outputPrice = 0;
      let fixedPrice = 0;
      let originalInputPrice: number | null = null;
      let originalOutputPrice: number | null = null;
      // "Truly free" only when every enabled group resolves to zero price.
      // Mirrors new-api-sync's guest-token allowlist so the FREE badge matches
      // what the guest token can actually call.
      let isFreeStrict = false;

      if (isFixedPrice) {
        fixedPrice = model.model_price ?? 0;
        isFreeStrict = fixedPrice === 0;
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

        const modelRatio = model.model_ratio ?? 0;
        if (enabledGroups.length > 0 && modelRatio === 0) {
          isFreeStrict = true;
        } else if (enabledGroups.length > 0) {
          isFreeStrict = enabledGroups.every((g) => (groupRatio[g] ?? 1) === 0);
        }

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
        isFree: isFreeStrict,
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
        cacheRatio: model.cache_ratio ?? null,
        createCacheRatio: model.create_cache_ratio ?? null,
        enableGroups: model.enable_groups ?? [],
        originalInputPrice,
        originalOutputPrice,
        metadata: parseModelMetadata(model.metadata),
      };
    })
    .sort((a, b) => {
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

  const modelsByType: { tag: string; models: ProcessedModel[] }[] = [];
  const typeMap = new Map<string, ProcessedModel[]>();
  for (const model of models) {
    const tag = model.tags[0] ?? "Other";
    const list = typeMap.get(tag);
    if (list) list.push(model);
    else typeMap.set(tag, [model]);
  }
  const typeOrder = ["Text", "Image", "Video"];
  const typeRank = (tag: string) => {
    const idx = typeOrder.indexOf(tag);
    return idx === -1 ? typeOrder.length : idx;
  };
  for (const [tag, tagModels] of typeMap) {
    modelsByType.push({ tag, models: tagModels });
  }
  modelsByType.sort((a, b) => {
    const diff = typeRank(a.tag) - typeRank(b.tag);
    return diff !== 0 ? diff : a.tag.localeCompare(b.tag);
  });

  const firstFreeModel =
    models.find((m) => m.isFree && m.type === "text") ??
    models.find((m) => m.isFree) ??
    null;

  const vendorNames = [...new Set(models.map((m) => m.vendor.name))].sort(
    (a, b) => a.localeCompare(b),
  );

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
    .slice(0, 5)
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
    autoGroups: response.auto_groups ?? [],
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
