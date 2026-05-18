import type { RankingPeriod } from "@/lib/api/typebox/rankings";
import { type TranslationKey, msg } from "@/lib/config/constants";

export const RANKING_PERIODS = [
  { id: "today", labelKey: msg("RANKINGS.PERIODS.TODAY") },
  { id: "week", labelKey: msg("RANKINGS.PERIODS.WEEK") },
  { id: "month", labelKey: msg("RANKINGS.PERIODS.MONTH") },
  { id: "year", labelKey: msg("RANKINGS.PERIODS.YEAR") },
  { id: "all", labelKey: msg("RANKINGS.PERIODS.ALL") },
] as const satisfies readonly { id: RankingPeriod; labelKey: TranslationKey }[];

const VALID_PERIODS = new Set<string>(RANKING_PERIODS.map((p) => p.id));

export function isValidPeriod(
  value: string | null | undefined,
): value is RankingPeriod {
  return !!value && VALID_PERIODS.has(value);
}

const MODEL_PERIOD_KEYS: Record<RankingPeriod, TranslationKey> = {
  today: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.TODAY",
  week: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.WEEK",
  month: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.MONTH",
  year: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.YEAR",
  all: "RANKINGS.MODELS.PERIOD_DESCRIPTIONS.ALL",
};

const VENDOR_PERIOD_KEYS: Record<RankingPeriod, TranslationKey> = {
  today: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.TODAY",
  week: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.WEEK",
  month: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.MONTH",
  year: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.YEAR",
  all: "RANKINGS.VENDORS.PERIOD_DESCRIPTIONS.ALL",
};

export function periodDescriptionKey(
  scope: "models" | "vendors",
  period: RankingPeriod,
): TranslationKey {
  return scope === "models"
    ? MODEL_PERIOD_KEYS[period]
    : VENDOR_PERIOD_KEYS[period];
}

export function splitHalf<T>(items: readonly T[]): [T[], T[]] {
  const half = Math.ceil(items.length / 2);
  return [items.slice(0, half), items.slice(half)];
}

type PivotPoint = {
  label: string;
  ts: string;
  key: string;
  value: number;
};

// Handles unix seconds, ISO strings, falls back to 0.
function tsToSortable(ts: string): number {
  const asNumber = Number(ts);
  if (Number.isFinite(asNumber)) return asNumber;
  const asDate = Date.parse(ts);
  if (Number.isFinite(asDate)) return asDate;
  return 0;
}

// Rows sorted by min `ts` per label so time axis stays monotonic regardless
// of upstream ordering.
export function pivotSeries(
  points: readonly PivotPoint[],
  keys: readonly string[],
): Array<Record<string, number | string>> {
  const byLabel = new Map<string, Record<string, number>>();
  const minTsByLabel = new Map<string, number>();

  for (const point of points) {
    const bucket = byLabel.get(point.label) ?? {};
    bucket[point.key] = (bucket[point.key] ?? 0) + point.value;
    byLabel.set(point.label, bucket);

    const sortable = tsToSortable(point.ts);
    const current = minTsByLabel.get(point.label);
    if (current === undefined || sortable < current) {
      minTsByLabel.set(point.label, sortable);
    }
  }

  const labelsSorted = [...byLabel.keys()].sort(
    (a, b) => (minTsByLabel.get(a) ?? 0) - (minTsByLabel.get(b) ?? 0),
  );

  return labelsSorted.map((label) => {
    const row: Record<string, number | string> = { label };
    const bucket = byLabel.get(label) ?? {};
    for (const key of keys) row[key] = bucket[key] ?? 0;
    return row;
  });
}
