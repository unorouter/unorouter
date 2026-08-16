import type { ProcessedModel } from "@/lib/api/pricing";
import { errMessage, modelMatchesSlug } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getPricingSnapshot } from "@/server/models/pricing/pricing-snapshot";
import { computeStatsSummary } from "@/server/ops/stats/stats.service";
import type { BadgePricing, BadgeStats } from "./types";

const EMPTY_STATS: BadgeStats = { tokenUsed: 0, requestCount: 0, avgTpm: 0 };

// A dead upstream must not kill badges; they render with zeros instead.
export async function getStats(): Promise<BadgeStats> {
  try {
    const summary = await computeStatsSummary();
    return {
      tokenUsed: summary.token_used,
      requestCount: summary.count,
      avgTpm: summary.avg_tpm,
    };
  } catch (err) {
    logger.warn("badge getStats: upstream failed, falling back to zero", {
      context: "badge",
      message: errMessage(err),
    });
    return EMPTY_STATS;
  }
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
