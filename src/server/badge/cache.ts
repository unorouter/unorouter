import { getAllQuotaDates } from "@/openapi";
import { unwrap } from "@/lib/utils/base";
import { ADMIN_HEADERS } from "../constants";
import { FAR_FUTURE } from "@/lib/config/constants";

export interface BadgeStats {
  tokenUsed: number;
  requestCount: number;
  avgTpm: number;
}

let cached: BadgeStats | null = null;
let cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function getStats(): Promise<BadgeStats> {
  if (cached && Date.now() - cachedAt < CACHE_TTL) return cached;

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

  cached = { tokenUsed, requestCount, avgTpm };
  cachedAt = Date.now();
  return cached;
}
