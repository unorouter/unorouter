import { buildPricingSummary, type ProcessedModel } from "@/lib/api/pricing";
import { FAR_FUTURE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getAllQuotaDates, getPricing } from "@/openapi";
import { ADMIN_HEADERS } from "../constants";

export interface BadgeStats {
  tokenUsed: number;
  requestCount: number;
  avgTpm: number;
}

export interface BadgePricingRow {
  model: string;
  vendor: string;
  inputPrice: number;
  outputPrice: number;
  originalInputPrice: number | null;
  originalOutputPrice: number | null;
}

export interface BadgePricing {
  modelCount: number;
  vendorCount: number;
  rows: BadgePricingRow[];
}

let cachedStats: BadgeStats | null = null;
let cachedStatsAt = 0;
let cachedPricing: BadgePricing | null = null;
let cachedPricingAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getStats(): Promise<BadgeStats> {
  if (cachedStats && Date.now() - cachedStatsAt < CACHE_TTL) return cachedStats;

  const now = Math.floor(Date.now() / 1000);
  const res = await getAllQuotaDates(
    { start_timestamp: 0, end_timestamp: FAR_FUTURE },
    { headers: ADMIN_HEADERS },
  );
  const body = unwrap(res);
  const data = body.data ?? [];

  const requestCount = data.reduce((s, d) => s + (d?.count ?? 0), 0);
  const tokenUsed = data.reduce((s, d) => s + (d?.token_used ?? 0), 0);

  let avgTpm = 0;
  if (data.length > 0) {
    const earliest = Math.min(...data.map((d) => d?.created_at ?? 0));
    const timeDiffMinutes = (now - earliest) / 60;
    if (timeDiffMinutes > 0) {
      avgTpm = Math.round(tokenUsed / timeDiffMinutes);
    }
  }

  cachedStats = { tokenUsed, requestCount, avgTpm };
  cachedStatsAt = Date.now();
  return cachedStats;
}

/** Pick top discounted text models for the pricing badge */
function pickPricingRows(models: ProcessedModel[]): BadgePricingRow[] {
  return models
    .filter(
      (m) =>
        m.type === "text" &&
        !m.isFixedPrice &&
        m.inputPrice > 0 &&
        m.originalInputPrice !== null,
    )
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
}

export async function getPricingData(): Promise<BadgePricing> {
  if (cachedPricing && Date.now() - cachedPricingAt < CACHE_TTL)
    return cachedPricing;

  const res = await getPricing();
  const summary = buildPricingSummary(unwrap(res));

  cachedPricing = {
    modelCount: summary.modelCount,
    vendorCount: summary.vendorCount,
    rows: pickPricingRows(summary.models),
  };
  cachedPricingAt = Date.now();
  return cachedPricing;
}
