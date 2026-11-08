import type { PricingCatalogDetail } from "@/openapi";
import type { PricingCatalogModel } from "@/openapi";
import { cache } from "react";
import type { ModelDetailData } from "@/lib/validation/data-policy";
import { rpc } from "@/lib/rpc";
import {
  getCatalog,
  getModelByName,
} from "@/server/models/pricing/pricing.service";
import { modelMatchesSlug, modelSlug, vendorSlug } from "@/lib/utils/base";

export type ResolvedModel = {
  model: ModelDetailData;
  atCapacity: boolean;
  models: PricingCatalogModel[];
};

function modelSegment(slug: string[]): string {
  if (slug.length !== 2) return "";
  return slug[1] ?? "";
}

export const resolveSlug = cache(
  async (
    slug: string[],
  ): Promise<
    | { kind: "model"; model: ResolvedModel }
    | { kind: "vendor"; vendor: string }
    | { kind: "redirect"; model: PricingCatalogDetail }
    | { kind: "retired"; vendor: string }
    | null
  > => {
    const model = await resolveModel(modelSegment(slug));
    if (model) return { kind: "model", model };
    const vendor = await resolveVendor(slug);
    if (vendor) return { kind: "vendor", vendor };
    if (slug.length === 1) {
      const legacy = await resolveModel(slug[0]!);
      if (legacy) return { kind: "redirect", model: legacy.model };
    }
    // A model gone past its retire window under a vendor that still exists: send
    // its links and rankings to the vendor page instead of a 404. Only when the
    // catalog loaded, so an upstream blip never redirects a live model.
    // Model ids are lowercase: a mistyped /DeepSeek/DeepSeek-V4-Pro link gets
    // the model page, not its vendor page or a 404.
    const lower = slug.map((s) => s.toLowerCase());
    if (lower.join("/") !== slug.join("/")) {
      const hit = await resolveModel(modelSegment(lower) || lower[0]!);
      if (hit) return { kind: "redirect", model: hit.model };
    }
    if (slug.length === 2) {
      const catalog = await getCatalog().catch(() => null);
      const owner = catalog?.models.length
        ? await resolveVendor([slug[0]!])
        : null;
      if (owner) return { kind: "retired", vendor: owner };
    }
    return null;
  },
);

async function resolveModel(slug: string): Promise<ResolvedModel | null> {
  if (!slug) return null;
  const catalog = await getCatalog().catch(() => null);
  const models = catalog?.models ?? [];
  const live = models.find((m) => modelMatchesSlug(m.model_name, slug));
  if (live) {
    const full = await getModelByName(live.model_name).catch(() => null);
    if (full) return { model: full, atCapacity: !live.online, models };
  }
  let name = slug;
  try {
    name = decodeURIComponent(slug);
  } catch {}
  const byName = await getModelByName(name).catch(() => null);
  if (byName) return { model: byName, atCapacity: true, models };
  return null;
}

async function resolveVendor(slug: string[]): Promise<string | null> {
  if (slug.length !== 1) return null;
  const res = await rpc.api.models.pricing.vendor.get({
    query: { name: slug[0]! },
  });
  return res.data?.[0]?.vendor ?? null;
}

export function canonicalHref(model: { model_name: string; vendor: string }) {
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
