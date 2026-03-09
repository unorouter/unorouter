import { ResponseArrayModelQuotaDataDataItem } from "@/openapi";

export function renderQuota(quota: number | undefined): string {
  if (quota === undefined || quota === null) return "$0.00";
  return `$${(quota / 500000).toFixed(2)}`;
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}

export type BucketData = {
  count: number;
  quota: number;
  tokenUsed: number;
};

export function processQuotaData(
  data: NonNullable<ResponseArrayModelQuotaDataDataItem>[],
  periodMinutes: number,
) {
  let totalCount = 0;
  let totalQuota = 0;
  let totalTokens = 0;
  const byHour = new Map<number, BucketData>();

  for (const item of data) {
    if (!item) continue;
    totalCount += item.count ?? 0;
    totalQuota += item.quota ?? 0;
    totalTokens += item.token_used ?? 0;

    const hourKey = item.created_at ?? 0;
    const existing = byHour.get(hourKey);
    if (existing) {
      existing.count += item.count ?? 0;
      existing.quota += item.quota ?? 0;
      existing.tokenUsed += item.token_used ?? 0;
    } else {
      byHour.set(hourKey, {
        count: item.count ?? 0,
        quota: item.quota ?? 0,
        tokenUsed: item.token_used ?? 0,
      });
    }
  }

  const sortedKeys = [...byHour.keys()].sort((a, b) => a - b);
  const buckets = sortedKeys.map((k) => byHour.get(k)!);

  const intervalMinutes =
    sortedKeys.length >= 2
      ? (sortedKeys[sortedKeys.length - 1] - sortedKeys[0]) /
        60 /
        Math.max(sortedKeys.length - 1, 1)
      : 60;

  const countTrend = buckets.map((b) => b.count);
  const quotaTrend = buckets.map((b) => b.quota);
  const tokenTrend = buckets.map((b) => b.tokenUsed);
  const rpmTrend = buckets.map((b) =>
    intervalMinutes > 0 ? b.count / intervalMinutes : 0,
  );
  const tpmTrend = buckets.map((b) =>
    intervalMinutes > 0 ? b.tokenUsed / intervalMinutes : 0,
  );

  const avgRpm = periodMinutes > 0 ? totalCount / periodMinutes : 0;
  const avgTpm = periodMinutes > 0 ? totalTokens / periodMinutes : 0;

  return {
    totalCount,
    totalQuota,
    totalTokens,
    avgRpm,
    avgTpm,
    trends: {
      count: countTrend,
      quota: quotaTrend,
      tokens: tokenTrend,
      rpm: rpmTrend,
      tpm: tpmTrend,
    },
  };
}


