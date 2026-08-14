import { FAR_FUTURE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { getQuotaDataSummary, type QuotaDataSummary } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

export type HistorySummary = QuotaDataSummary;

export async function computeStatsSummary(): Promise<HistorySummary> {
  const res = await getQuotaDataSummary(
    { start_timestamp: 0, end_timestamp: FAR_FUTURE },
    { headers: ADMIN_HEADERS },
  );
  return unwrap(res).data;
}
