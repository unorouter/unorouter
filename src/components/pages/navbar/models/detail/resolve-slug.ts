import type { PricingCatalogDetail } from "@/openapi";
import type { PricingCatalogModel } from "@/openapi";
import { cache } from "react";
import { rpc } from "@/lib/rpc";
import {
  getCatalog,
  getModelByName,
} from "@/server/models/pricing/pricing.service";
import { modelMatchesSlug, modelSlug, vendorSlug } from "@/lib/utils/base";

export type ResolvedModel = {
  model: PricingCatalogDetail;
  atCapacity: boolean;
  // Catalog rows, for the similar-models lookup only.
  models: PricingCatalogModel[];
};

// /models/[vendor] is a vendor listing; /models/[vendor]/[model] is a detail
// page. One catch-all route serves both, so the segment count decides which.
function modelSegment(slug: string[]): string {
  if (slug.length !== 2) return "";
  return slug[1] ?? "";
}

// One resolve per request: generateMetadata and the page both need this, and
// without cache() each pays a full pricing fetch for the same slug.
export const resolveSlug = cache(
  async (
    slug: string[],
  ): Promise<
    | { kind: "model"; model: ResolvedModel }
    | { kind: "vendor"; vendor: string }
    | null
  > => {
    const model = await resolveModel(modelSegment(slug));
    if (model) return { kind: "model", model };
    const vendor = await resolveVendor(slug);
    return vendor ? { kind: "vendor", vendor } : null;
  },
);

async function resolveModel(slug: string): Promise<ResolvedModel | null> {
  if (!slug) return null;
  const catalog = await getCatalog().catch(() => null);
  const models = catalog?.models ?? [];
  const live = models.find((m) => modelMatchesSlug(m.model_name, slug));
  // The catalog row cannot drive the detail page (no ratios, groups or grid
  // pricing), so a hit still fetches the full record by name.
  if (live) {
    const full = await getModelByName(live.model_name).catch(() => null);
    if (full) return { model: full, atCapacity: !live.online, models };
  }
  // A model whose channels are all disabled never reaches /pricing, which filters
  // by servable group. The by-name route applies no such filter, so the detail
  // page still renders. modelSlug only percent-encodes []/, so the name decodes
  // straight back.
  let name = slug;
  try {
    name = decodeURIComponent(slug);
  } catch {}
  const byName = await getModelByName(name).catch(() => null);
  if (byName) return { model: byName, atCapacity: true, models };
  return null;
}

// Upstream matches a vendor by slug as well as by exact name, so the segment
// goes straight to it rather than pulling every vendor name back to translate
// it here. The rows carry the real name, which is what the page renders.
async function resolveVendor(slug: string[]): Promise<string | null> {
  if (slug.length !== 1) return null;
  const res = await rpc.api.models.pricing.vendor.get({
    query: { name: slug[0]! },
  });
  return res.data?.[0]?.vendor ?? null;
}

export function canonicalHref(model: PricingCatalogDetail) {
  const vendor = vendorSlug(model.vendor) || "unknown";
  const slug = [vendor, modelSlug(model.model_name)];
  return { pathname: "/models/[...slug]" as const, params: { slug } };
}

export function vendorHref(vendorName: string) {
  return {
    pathname: "/models/[...slug]" as const,
    params: { slug: [vendorSlug(vendorName)] },
  };
}
