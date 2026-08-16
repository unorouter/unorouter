import { type ProcessedModel } from "@/lib/api/pricing";
import { cache } from "react";
import { getCachedPricingVendors } from "@/lib/api/page-data";
import {
  getModelByName,
  getPricingSummary,
} from "@/server/models/pricing/pricing.service";
import {
  modelMatchesSlug,
  modelSlug,
  vendorMatchesSlug,
  vendorSlug,
} from "@/lib/utils/base";

export type ResolvedModel = {
  model: ProcessedModel;
  atCapacity: boolean;
  data: Awaited<ReturnType<typeof getPricingSummary>> | null;
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
  const data = await getPricingSummary().catch(() => null);
  const live = data?.models.find((m) => modelMatchesSlug(m.name, slug));
  if (live) return { model: live, atCapacity: !live.online, data };
  // A model whose channels are all disabled never reaches /pricing, which filters
  // by servable group. The by-name route applies no such filter, so the detail
  // page still renders. modelSlug only percent-encodes []/, so the name decodes
  // straight back.
  let name = slug;
  try {
    name = decodeURIComponent(slug);
  } catch {}
  const byName = await getModelByName(name).catch(() => null);
  if (byName) return { model: byName, atCapacity: true, data };
  return null;
}

async function resolveVendor(slug: string[]): Promise<string | null> {
  if (slug.length !== 1) return null;
  const seg = slug[0]!;
  const vendorNames = await getCachedPricingVendors().catch(() => []);
  const match = vendorNames.find((v) => vendorMatchesSlug(v, seg));
  return match ?? null;
}

export function canonicalHref(model: ProcessedModel) {
  const vendor = vendorSlug(model.vendor.name) || "unknown";
  const slug = [vendor, modelSlug(model.name)];
  return { pathname: "/models/[...slug]" as const, params: { slug } };
}

export function vendorHref(vendorName: string) {
  return {
    pathname: "/models/[...slug]" as const,
    params: { slug: [vendorSlug(vendorName)] },
  };
}
