import type { PricingData, PricingModel } from "@/openapi";
import { escapeRegex } from "@/lib/utils/base";
import {
  computeMinGroupRatio,
  parseTiersFromExpr,
  tierDisplayPrices,
} from "./tiered-pricing";

const MODEL_TYPES = ["text", "image", "video", "audio", "embedding"] as const;
export type ModelType = (typeof MODEL_TYPES)[number];

export function isMediaType(type: ModelType | undefined): boolean {
  return type != null && type !== "text";
}

export type GridPricingRow = Record<string, string | number>;

export type EndpointInfo = {
  method: string;
  path: string;
};

export type ModelMetadata = {
  maxInputTokens?: number;
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
  releaseDate?: string;
  series?: string;
  categories?: string[];
  deprecationDate?: string;
  mode?: string;
  description?: string;

  supportedParameters?: string[];
  supportedParametersAll?: string[];
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
  return MODEL_TYPES.find((v) => v === tag) ?? "text";
}

function parseModelMetadata(raw: string | undefined): ModelMetadata {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      // Duplicates the top-level model description (~120KB across the list);
      // nothing reads it from metadata.
      delete (parsed as Record<string, unknown>).description;
      return parsed as ModelMetadata;
    }
  } catch {}
  return {};
}

export function processModels(response: PricingData) {
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
      const isFixedPrice = qt === 1 || qt === 3 || qt === 4;
      const billingMode = model.billing_mode ?? null;
      const billingExpr = model.billing_expr ?? null;
      const isTiered = billingMode === "tiered_expr" && Boolean(billingExpr);

      let inputPrice = 0;
      let outputPrice = 0;
      let fixedPrice = 0;
      let originalFixedPrice: number | null = null;
      let originalInputPrice: number | null = null;
      let originalOutputPrice: number | null = null;
      let isFreeStrict = false;

      const gridMinRatio = computeMinGroupRatio(
        model.enable_groups ?? [],
        groupRatio,
      );

      if (isFixedPrice) {
        const sticker = model.model_price ?? 0;
        const minRatio = gridMinRatio;
        fixedPrice = sticker * minRatio;
        if (showOriginalPrice && minRatio < 1 && sticker > 0) {
          originalFixedPrice = sticker;
        }
        isFreeStrict = fixedPrice === 0;
      } else if (isTiered) {
        const minRatio = computeMinGroupRatio(
          model.enable_groups ?? [],
          groupRatio,
        );
        const tiers = parseTiersFromExpr(billingExpr ?? "");
        if (tiers.length > 0) {
          const rows = tiers.map((tier) => tierDisplayPrices(tier, minRatio));
          const lowest = rows.reduce((acc, row) =>
            row.inputPrice + row.outputPrice < acc.inputPrice + acc.outputPrice
              ? row
              : acc,
          );
          inputPrice = lowest.inputPrice;
          outputPrice = lowest.outputPrice;
        }
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
        const modelPriceVal = model.model_price ?? 0;
        const groupIsFree = (g: string) =>
          modelPriceVal <= 0 &&
          ((groupRatio[g] ?? 1) === 0 || modelRatio === 0);
        if (enabledGroups.length > 0) {
          isFreeStrict = enabledGroups.some(groupIsFree);
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

      if (gridPricing) {
        let minTier = Number.POSITIVE_INFINITY;
        for (const row of gridPricing) {
          const p = typeof row.Pricing === "number" ? row.Pricing : NaN;
          if (Number.isFinite(p) && p > 0 && p < minTier) minTier = p;
        }
        if (Number.isFinite(minTier)) {
          fixedPrice = minTier * gridMinRatio;
          originalFixedPrice =
            showOriginalPrice && gridMinRatio < 1 ? minTier : null;
        }
      }

      return {
        name: model.model_name ?? "",
        vendor,
        inputPrice,
        outputPrice,
        fixedPrice,
        originalFixedPrice,
        isFixedPrice,
        isTiered,
        isFree: isFreeStrict,
        quotaType: qt,
        gridPricing,
        gridMinRatio,
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
        audioRatio: model.audio_ratio ?? null,
        audioCompletionRatio: model.audio_completion_ratio ?? null,
        billingMode,
        billingExpr,
        pricingVersion: model.pricing_version ?? null,
        enableGroups: model.enable_groups ?? [],
        originalInputPrice,
        originalOutputPrice,
        createdTime: (model as { created_time?: number }).created_time ?? null,
        online: model.online ?? true,
        metadata: parseModelMetadata(model.metadata),
      };
    })
    .sort((a, b) => {
      if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

function releaseTs(m: ProcessedModel): number {
  const iso = m.metadata.releaseDate;
  const ms = iso ? Date.parse(iso) : NaN;
  if (Number.isFinite(ms)) return ms;
  return m.createdTime ? m.createdTime * 1000 : 0;
}

export function groupModelsByType(models: ProcessedModel[]) {
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
    tagModels.sort((a, b) => {
      const diff = releaseTs(b) - releaseTs(a);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
    modelsByType.push({ tag, models: tagModels });
  }
  modelsByType.sort((a, b) => {
    const diff = typeRank(a.tag) - typeRank(b.tag);
    return diff !== 0 ? diff : a.tag.localeCompare(b.tag);
  });
  return modelsByType;
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

  const modelsByType = groupModelsByType(models);

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

  const freeCount = models.filter((m) => m.isFree).length;

  return {
    modelCount: models.length,
    freeCount,
    paidCount: models.length - freeCount,
    vendorCount: vendors.length,
    models,
    vendors,
    vendorNames,
    modelsByType,
    firstFreeModel,
    endpointMap,
    groupRatioMap: response.group_ratio ?? {},
    usableGroup: response.usable_group ?? {},
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

export function vendorDisplayName(name: string): string {
  return name.replace(/\b\w/g, (c) => c.toUpperCase());
}

export type GroupEntry = { group: string; ratio: number };

export function groupDisplayLabel(group: string, model: string | null): string {
  if (!model) return group;
  const stripped = group
    .replace(new RegExp(`-?${escapeRegex(model)}$`), "")
    .replace(/-+$/, "");
  return stripped.length > 0 ? stripped : group;
}

export function buildGroupEntries(
  enableGroups: readonly string[],
  groupRatioMap: Record<string, number>,
): GroupEntry[] {
  const entries: GroupEntry[] = [];
  for (const group of enableGroups) {
    const ratio = groupRatioMap[group];
    if (ratio === undefined) continue;
    entries.push({ group, ratio });
  }
  return entries.sort((a, b) => a.ratio - b.ratio);
}

export function gridPricingColumns(rows: GridPricingRow[]): string[] {
  const first = rows[0];
  if (!first) return [];
  return Object.keys(first).filter(
    (k) => k !== "Pricing" && k !== "PricingSuffix",
  );
}

export function gridPriceParts(
  row: GridPricingRow,
  multiplier = 1,
): { price: number; suffix: string } {
  return {
    price: typeof row.Pricing === "number" ? row.Pricing * multiplier : 0,
    suffix: typeof row.PricingSuffix === "string" ? row.PricingSuffix : "",
  };
}

export type PricingSummary = ReturnType<typeof buildPricingSummary>;
export type LeanPricing = ReturnType<typeof toLeanPricing>;

const LEAN_DESCRIPTION_CHARS = 200;

function leanModel(model: ProcessedModel): ProcessedModel {
  const description = model.description;
  return {
    ...model,
    description:
      description && description.length > LEAN_DESCRIPTION_CHARS
        ? `${description.slice(0, LEAN_DESCRIPTION_CHARS).trimEnd()}...`
        : description,
    metadata: { ...model.metadata, defaultParameters: undefined },
  };
}

// The list payload every page hydrates or fetches: one copy of each model
// (the full summary duplicates every model ~3.5x via modelsByType and
// vendors[].models), descriptions truncated to card length, parameter
// defaults dropped. Group maps carry only groups some model references
// (upstream ships ~3x more), and usableGroup has no client consumer. Full
// models come from the per-model detail endpoint.
export function toLeanPricing(summary: PricingSummary) {
  const usedGroups = new Set<string>();
  for (const model of summary.models) {
    for (const group of model.enableGroups) usedGroups.add(group);
  }
  const groupRatioMap: Record<string, number> = {};
  for (const [group, ratio] of Object.entries(summary.groupRatioMap)) {
    if (usedGroups.has(group)) groupRatioMap[group] = ratio;
  }
  return {
    modelCount: summary.modelCount,
    freeCount: summary.freeCount,
    paidCount: summary.paidCount,
    vendorCount: summary.vendorCount,
    models: summary.models.map(leanModel),
    vendorNames: summary.vendorNames,
    firstFreeModel: summary.firstFreeModel
      ? leanModel(summary.firstFreeModel)
      : null,
    endpointMap: summary.endpointMap,
    groupRatioMap,
    autoGroups: summary.autoGroups.filter((g) => usedGroups.has(g)),
  };
}
