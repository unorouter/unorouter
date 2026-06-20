import { getAllQuotaDates } from "@/openapi";
import { unixSec, unwrap } from "@/lib/utils/base";
import { Elysia } from "elysia";
import { ADMIN_HEADERS } from "@/server/constants";
import { FAR_FUTURE } from "@/lib/config/constants";

// The quota-dates payload exceeds the Next data cache 2MB limit, so PUBLIC_CACHE never stored it. Cache the computed summary in-module instead.
const SUMMARY_TTL_MS = 5 * 60 * 1000;
let cached: { at: number; value: HistorySummary } | null = null;

type HistorySummary = {
  avgTpm: number;
  requestCount: number;
  tokenUsed: number;
};

async function computeSummary(): Promise<HistorySummary> {
  const now = unixSec();

  const res = await getAllQuotaDates(
    { start_timestamp: 0, end_timestamp: FAR_FUTURE },
    { headers: ADMIN_HEADERS },
  );
  const body = unwrap(res);
  const data = body.data ?? [];

  const requestCount = data.reduce((s, d) => s + (d?.count ?? 0), 0);
  const tokenUsed = data.reduce((s, d) => s + (d?.token_used ?? 0), 0);

  // Avg TPM: total tokens / time span from first data point to now
  let avgTpm = 0;
  if (data.length > 0) {
    const earliest = Math.min(...data.map((d) => d?.created_at ?? 0));
    const timeDiffMinutes = (now - earliest) / 60;
    if (timeDiffMinutes > 0) {
      avgTpm = Math.round(tokenUsed / timeDiffMinutes);
    }
  }

  return { avgTpm, requestCount, tokenUsed };
}

export const statsRoute = new Elysia({ prefix: "/stats" }).get(
  "/history",
  async () => {
    if (cached && Date.now() - cached.at < SUMMARY_TTL_MS) return cached.value;
    const value = await computeSummary();
    cached = { at: Date.now(), value };
    return value;
  },
);
