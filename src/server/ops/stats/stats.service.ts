import { FAR_FUTURE } from "@/lib/config/constants";
import { unixSec, unwrap } from "@/lib/utils/base";
import { getQuotaDataSummary } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

export type HistorySummary = {
  avgTpm: number;
  requestCount: number;
  tokenUsed: number;
};

export async function computeStatsSummary(): Promise<HistorySummary> {
  const now = unixSec();

  const res = await getQuotaDataSummary(
    { start_timestamp: 0, end_timestamp: FAR_FUTURE },
    { headers: ADMIN_HEADERS },
  );
  const summary = unwrap(res).data;

  const requestCount = summary?.count ?? 0;
  const tokenUsed = summary?.token_used ?? 0;

  let avgTpm = 0;
  const earliest = summary?.earliest_created_at ?? 0;
  if (earliest > 0) {
    const timeDiffMinutes = (now - earliest) / 60;
    if (timeDiffMinutes > 0) {
      avgTpm = Math.round(tokenUsed / timeDiffMinutes);
    }
  }

  return { avgTpm, requestCount, tokenUsed };
}
