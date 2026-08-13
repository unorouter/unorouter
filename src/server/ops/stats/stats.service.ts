import { FAR_FUTURE } from "@/lib/config/constants";
import { unixSec, unwrap } from "@/lib/utils/base";
import { getAllQuotaDates } from "@/openapi";
import { ADMIN_HEADERS } from "@/server/constants";

export type HistorySummary = {
  avgTpm: number;
  requestCount: number;
  tokenUsed: number;
};

export async function computeStatsSummary(): Promise<HistorySummary> {
  const now = unixSec();

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
    const earliest = data.reduce(
      (min, d) => Math.min(min, d?.created_at ?? 0),
      Infinity,
    );
    const timeDiffMinutes = (now - earliest) / 60;
    if (timeDiffMinutes > 0) {
      avgTpm = Math.round(tokenUsed / timeDiffMinutes);
    }
  }

  return { avgTpm, requestCount, tokenUsed };
}
