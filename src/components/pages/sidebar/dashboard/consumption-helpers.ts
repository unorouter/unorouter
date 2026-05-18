import type { ChartConfig } from "@/components/ui/chart";
import { modelColor } from "@/lib/utils/format/color";
import { bucketKey, type Granularity } from "@/lib/utils/format/date";
import { quotaToDollars, type QuotaDataItem } from "./stats";

export { pickGranularity } from "@/lib/utils/format/date";

/** Build a recharts `ChartConfig` from a list of model names, assigning each
 *  a deterministic color. Shared between dashboard charts and rankings charts. */
export function buildModelChartConfig(modelNames: string[]): ChartConfig {
  const config: ChartConfig = {};
  for (const name of modelNames) {
    config[name] = { label: name, color: modelColor(name) };
  }
  return config;
}

export function processDistributionData(
  data: QuotaDataItem[],
  g: Granularity,
) {
  const byTime = new Map<string, Record<string, number>>();
  const modelTotals = new Map<string, number>();

  for (const item of data) {
    if (!item.created_at || !item.model_name) continue;
    const key = bucketKey(item.created_at, g);
    const dollars = quotaToDollars(item.quota ?? 0);
    modelTotals.set(
      item.model_name,
      (modelTotals.get(item.model_name) ?? 0) + dollars,
    );
    const existing = byTime.get(key) ?? {};
    existing[item.model_name] = (existing[item.model_name] ?? 0) + dollars;
    byTime.set(key, existing);
  }

  const modelList = [...modelTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const chartData = [...byTime.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, values]) => ({ time, ...values }));

  return { chartData, modelList };
}

export function processTrendData(data: QuotaDataItem[], g: Granularity) {
  const byTime = new Map<string, { quota: number; count: number }>();

  for (const item of data) {
    if (!item.created_at) continue;
    const key = bucketKey(item.created_at, g);
    const existing = byTime.get(key) ?? { quota: 0, count: 0 };
    existing.quota += quotaToDollars(item.quota ?? 0);
    existing.count += item.count ?? 0;
    byTime.set(key, existing);
  }

  return [...byTime.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, values]) => ({
      time,
      quota: Number(values.quota.toFixed(4)),
      count: values.count,
    }));
}
