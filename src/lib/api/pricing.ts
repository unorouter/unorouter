import type { ModelMetadata, PricingCatalogModel } from "@/openapi";

export type { ModelMetadata };
import { escapeRegex } from "@/lib/utils/base";

export type ModelType = "text" | "image" | "video" | "audio" | "embedding";

export function isMediaType(type: string | undefined): boolean {
  return type != null && type !== "text";
}

// Columns vary per model, so values are read through typeof guards rather
// than assumed: this mirrors the gateway's open row map.
export type GridPricingRow = Record<string, unknown>;

export type EndpointInfo = {
  method: string;
  path: string;
};

export function groupModelsByType<
  T extends { model_name: string; tags: string[]; release_ts: number },
>(models: T[]) {
  const modelsByType: { tag: string; models: T[] }[] = [];
  const typeMap = new Map<string, T[]>();
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
      const diff = b.release_ts - a.release_ts;
      return diff !== 0 ? diff : a.model_name.localeCompare(b.model_name);
    });
    modelsByType.push({ tag, models: tagModels });
  }
  modelsByType.sort((a, b) => {
    const diff = typeRank(a.tag) - typeRank(b.tag);
    return diff !== 0 ? diff : a.tag.localeCompare(b.tag);
  });
  return modelsByType;
}

// Vendor identity is an id comparison, not a name one: names collide across
// sources, so two rows can read "OpenAI" and be different vendors.
export function findSimilarModels(
  all: PricingCatalogModel[],
  current: { model_name: string; vendor_id: number; tags: string[] },
  limit = 6,
): { sameVendor: PricingCatalogModel[]; sameTag: PricingCatalogModel[] } {
  const others = all.filter((m) => m.model_name !== current.model_name);

  const sameVendor = others
    .filter((m) => m.vendor_id === current.vendor_id)
    .slice(0, 3);

  const currentTags = new Set(current.tags ?? []);
  const sameTag = others
    .filter(
      (m) =>
        m.vendor_id !== current.vendor_id &&
        (m.tags ?? []).some((t) => currentTags.has(t)),
    )
    .slice(0, limit - sameVendor.length);

  return { sameVendor, sameTag };
}

export function findContextTag(model: { tags: string[] }): string | undefined {
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
