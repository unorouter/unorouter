import { clamp } from "../base";
export const QUOTA_PER_DOLLAR = 500000;

export function quotaToDollars(quota: number): number {
  return quota / QUOTA_PER_DOLLAR;
}

export function dollarsToQuota(dollars: number): number {
  return Math.round(dollars * QUOTA_PER_DOLLAR);
}

export function renderQuota(quota: number | undefined, decimals = 2): string {
  if (quota === undefined || quota === null) return "$0.00";
  return `$${quotaToDollars(quota).toFixed(decimals)}`;
}

export function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price >= 0.01) return `$${price.toFixed(2)}`;
  if (price >= 0.0001) return `$${price.toFixed(4).replace(/0+$/, "")}`;
  const exp = Math.floor(Math.log10(price));
  const decimals = Math.min(-exp + 1, 10);
  return `$${price.toFixed(decimals)}`;
}

export function discountPercent(
  current: number,
  original: number | null,
): number {
  if (original === null || original <= 0 || current >= original) return 0;
  return Math.round(((original - current) / original) * 100);
}

export function parsePercent(progress: string | undefined | null): number {
  if (!progress) return 0;
  const m = progress.match(/(\d+)%/);
  if (!m) return 0;
  return clamp(parseInt(m[1], 10), 0, 100);
}

export function formatPriceCompact(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "$0";
  if (price < 0.01) return `$${price.toFixed(4)}`;
  if (price < 1) return `$${price.toFixed(3)}`;
  if (price < 10) return `$${price.toFixed(2)}`;
  return `$${Math.round(price)}`;
}

function isCjkMyriadLocale(locale: string | undefined): boolean {
  return locale === "zh-CN" || locale === "zh-TW" || locale === "ja";
}

export function formatTokenCount(
  tokens: number | undefined,
  locale?: string,
): string {
  if (tokens === undefined || !Number.isFinite(tokens) || tokens <= 0) {
    return "-";
  }
  if (isCjkMyriadLocale(locale)) {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(tokens);
  }
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000;
    return m === Math.floor(m) ? `${m}M` : `${m.toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    const k = tokens / 1_000;
    return k === Math.floor(k) ? `${k}K` : `${k.toFixed(1)}K`;
  }
  return String(tokens);
}

export function formatTokens(value: number, locale?: string): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (isCjkMyriadLocale(locale)) {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  }
  if (value >= 1_000_000_000_000)
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 1 : 2)}B`;
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000)
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString(locale);
}

export function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return "0%";
  if (share < 0.001) return "<0.1%";
  return `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%`;
}

export function formatLatency(ms: number, decimals = 2): string {
  if (!ms) return "-";
  if (ms >= 1000) return `${(ms / 1000).toFixed(decimals)}s`;
  return `${Math.round(ms)}ms`;
}

export function formatTps(tps: number, suffix = ""): string {
  if (!tps) return "-";
  if (tps >= 100) return `${tps.toFixed(0)}${suffix}`;
  return `${tps.toFixed(1)}${suffix}`;
}

export function formatPct(pct: number, decimals = 2): string {
  if (!Number.isFinite(pct)) return "-";
  return `${pct.toFixed(decimals)}%`;
}

// Best discount across the sides a model actually charges for, matching what the
// price columns render: a fixed-price model discounts one side, a per-token model
// can discount input and output independently.
export function bestDiscountPercent(model: {
  is_fixed_price: boolean;
  fixed_price: number;
  original_fixed_price?: number | null;
  input_price: number;
  output_price: number;
  original_input_price?: number | null;
  original_output_price?: number | null;
}): number {
  if (model.is_fixed_price)
    return discountPercent(
      model.fixed_price,
      model.original_fixed_price ?? null,
    );
  return Math.max(
    discountPercent(model.input_price, model.original_input_price ?? null),
    discountPercent(model.output_price, model.original_output_price ?? null),
  );
}
