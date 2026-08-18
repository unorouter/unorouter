import { FAR_FUTURE } from "@/lib/config/constants";
import { errMessage, unwrap } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getQuotaDataSummary } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import {
  getCatalog,
  getModelByName,
} from "@/server/models/pricing/pricing.service";
import type { PricingCatalogDetail, PricingCatalogModel } from "@/openapi";
import type { BadgePricing, BadgeStats } from "./types";

export function getStats(): Promise<BadgeStats> {
  return getQuotaDataSummary(
    { start_timestamp: 0, end_timestamp: FAR_FUTURE },
    { headers: ADMIN_HEADERS },
  )
    .then((res) => unwrap(res).data)
    .catch((err) => {
      logger.warn("badge getStats: upstream failed, falling back to zero", {
        context: "badge",
        message: errMessage(err),
      });
      return {
        token_used: 0,
        count: 0,
        avg_tpm: 0,
        quota: 0,
        earliest_created_at: 0,
      };
    });
}

// modelSlug only percent-encodes []/ and no live model name contains them, so a
// badge's slug decodes straight back to the name the by-name route takes.
export async function findBadgeModel(
  nameOrSlug: string,
): Promise<PricingCatalogDetail | null> {
  let name = nameOrSlug;
  try {
    name = decodeURIComponent(nameOrSlug);
  } catch {}
  return getModelByName(name);
}

// The steepest discount per vendor, deepest first: the badge advertises what a
// caller saves, so one headline model per vendor rather than five from whoever
// discounts most.
function topDiscounted(models: PricingCatalogModel[]) {
  const byVendor = new Map<string, PricingCatalogModel>();
  for (const m of models) {
    if (m.type !== "text" || m.is_fixed_price || m.input_price <= 0) continue;
    if (m.original_input_price == null) continue;
    const seen = byVendor.get(m.vendor);
    if (!seen || m.input_price > seen.input_price) byVendor.set(m.vendor, m);
  }
  const discount = (m: PricingCatalogModel) =>
    1 - m.input_price / (m.original_input_price ?? m.input_price);
  return [...byVendor.values()]
    .sort((a, b) => discount(b) - discount(a))
    .slice(0, 5)
    .map((m) => ({
      model: m.model_name,
      vendor: m.vendor,
      inputPrice: m.input_price,
      outputPrice: m.output_price,
      originalInputPrice: m.original_input_price ?? null,
      originalOutputPrice: m.original_output_price ?? null,
    }));
}

export async function getPricingData(): Promise<BadgePricing> {
  const catalog = await getCatalog(true);
  const vendorModelCounts: Record<string, number> = {};
  for (const m of catalog.models) {
    vendorModelCounts[m.vendor] = (vendorModelCounts[m.vendor] ?? 0) + 1;
  }
  return {
    modelCount: catalog.counts.models,
    freeCount: catalog.counts.free,
    paidCount: catalog.counts.paid,
    vendorCount: catalog.counts.vendors,
    vendorNames: [...new Set(catalog.models.map((m) => m.vendor))].sort(
      (a, b) => a.localeCompare(b),
    ),
    vendorModelCounts,
    rows: topDiscounted(catalog.models),
  };
}
