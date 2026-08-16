import { FAR_FUTURE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getQuotaDataSummary, type QuotaDataSummary } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

export type HistorySummary = QuotaDataSummary;

// The upstream summary is a SQL aggregate over the whole quota_data table, so
// the homepage ticker must not re-run it per visitor. Caching the PROMISE
// makes concurrent misses at expiry share one aggregate run.
const SUMMARY_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; value: Promise<HistorySummary> } | null = null;

export function computeStatsSummary(): Promise<HistorySummary> {
  if (!cached || Date.now() - cached.at >= SUMMARY_TTL_MS) {
    const entry = {
      at: Date.now(),
      value: fetchSummary(),
    };
    entry.value.catch(() => {
      if (cached === entry) cached = null;
    });
    cached = entry;
  }
  return cached.value;
}

async function fetchSummary(): Promise<HistorySummary> {
  const res = await getQuotaDataSummary(
    { start_timestamp: 0, end_timestamp: FAR_FUTURE },
    { headers: ADMIN_HEADERS },
  );
  return unwrap(res).data;
}
