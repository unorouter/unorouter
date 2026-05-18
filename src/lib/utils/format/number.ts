// 1 USD = 500000 quota units in new-api.
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

export function parsePercent(progress: string | undefined | null): number {
  if (!progress) return 0;
  const m = progress.match(/(\d+)%/);
  if (!m) return 0;
  return Math.min(100, Math.max(0, parseInt(m[1], 10)));
}

export function formatPriceCompact(price: number): string {
  if (!Number.isFinite(price) || price <= 0) return "$0";
  if (price < 0.01) return `$${price.toFixed(4)}`;
  if (price < 1) return `$${price.toFixed(3)}`;
  if (price < 10) return `$${price.toFixed(2)}`;
  return `$${Math.round(price)}`;
}

export function formatTokenCount(tokens: number | undefined): string {
  if (tokens === undefined || !Number.isFinite(tokens) || tokens <= 0) {
    return "—";
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

export function formatTokens(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0";
  if (value >= 1_000_000_000_000)
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (value >= 1_000_000_000)
    return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 1 : 2)}B`;
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (value >= 1_000)
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return value.toLocaleString();
}

export function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return "0%";
  if (share < 0.001) return "<0.1%";
  return `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%`;
}

export function formatLatency(ms: number, decimals = 2): string {
  if (!ms) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(decimals)}s`;
  return `${Math.round(ms)}ms`;
}

export function formatTps(tps: number, suffix = ""): string {
  if (!tps) return "—";
  if (tps >= 100) return `${tps.toFixed(0)}${suffix}`;
  return `${tps.toFixed(1)}${suffix}`;
}

export function formatPct(pct: number, decimals = 2): string {
  if (!Number.isFinite(pct)) return "—";
  return `${pct.toFixed(decimals)}%`;
}
