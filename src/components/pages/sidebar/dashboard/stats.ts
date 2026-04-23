import type { ResponseArrayModelQuotaDataDataItem } from "@/openapi";
import dayjs from "dayjs";

export { quotaToDollars, renderQuota } from "@/lib/config/constants";

export type QuotaDataItem = NonNullable<ResponseArrayModelQuotaDataDataItem>;

export function formatDate(value: string | number | undefined): string {
  if (!value) return "";
  const d = typeof value === "number" ? dayjs.unix(value) : dayjs(value);
  if (!d.isValid()) return typeof value === "string" ? value : "";
  return d.format("MMM D, YYYY");
}

export function filterQuotaData(
  data: (ResponseArrayModelQuotaDataDataItem | null | undefined)[],
): QuotaDataItem[] {
  return data.filter((item): item is QuotaDataItem => item != null);
}

export function aggregateByModel(
  data: QuotaDataItem[],
  field: "count" | "quota",
  limit: number,
  otherLabel?: string,
): { name: string; count: number }[] {
  const byModel = new Map<string, number>();

  for (const item of data) {
    if (!item.model_name) continue;
    byModel.set(
      item.model_name,
      (byModel.get(item.model_name) ?? 0) + (item[field] ?? 0),
    );
  }

  const sorted = [...byModel.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, count: value }));

  if (!otherLabel || sorted.length <= limit) return sorted.slice(0, limit);

  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const otherCount = rest.reduce((sum, item) => sum + item.count, 0);
  if (otherCount <= 0) return top;
  return [...top, { name: otherLabel, count: otherCount }];
}

export type BucketData = {
  count: number;
  quota: number;
  tokenUsed: number;
};

export function processQuotaData(data: QuotaDataItem[], periodMinutes: number) {
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
