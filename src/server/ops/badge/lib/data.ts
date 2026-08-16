import type { ProcessedModel } from "@/lib/api/pricing";
import { FAR_FUTURE } from "@/lib/config/constants";
import { errMessage, modelMatchesSlug, unwrap } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getQuotaDataSummary } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";
import { getPricingSnapshot } from "@/server/models/pricing/pricing-snapshot";
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

export async function findBadgeModel(
  nameOrSlug: string,
): Promise<ProcessedModel | null> {
  const { models } = await getPricingSnapshot();
  return models.find((m) => modelMatchesSlug(m.name, nameOrSlug)) ?? null;
}

export async function getPricingData(): Promise<BadgePricing> {
  const { summary } = await getPricingSnapshot();
  const vendorModelCounts: Record<string, number> = {};
  for (const v of summary.vendors) {
    vendorModelCounts[v.name] = v.modelCount;
  }
  return {
    modelCount: summary.modelCount,
    freeCount: summary.freeCount,
    paidCount: summary.paidCount,
    vendorCount: summary.vendorCount,
    vendorNames: summary.vendorNames,
    vendorModelCounts,
    rows: summary.topDiscounted,
  };
}
