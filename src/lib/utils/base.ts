import { msg } from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import type { ReactNode } from "react";
import type {
  ExcludeVoid,
  ExtractData,
  UnwrapApiResponse,
} from "../types/eden";

export function safeJsonParse<T = Record<string, unknown>>(
  raw: string | undefined | null,
  fallback: T,
): T {
  if (!raw) return fallback;
  try {
    // SAFETY: caller provides typed fallback; parse failure is caught
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";

export function uid(length = 21): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let id = "";
  for (let i = 0; i < length; i++) id += ALPHABET[bytes[i] & 63];
  return id;
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function shareUrl(shareId: string): string {
  return `${env.appUrl}/shared/${shareId}`;
}

/** Encode a model name for safe use as a URL slug. next-intl's pathname
 * matcher rejects raw `[`/`]` in param values because they collide w/ the
 * `[slug]` template syntax. Models like `claude-haiku-4-5-20251001[1m]`
 * need their brackets URL-encoded. */
export function modelSlug(name: string): string {
  return name.replace(/\[/g, "%5B").replace(/\]/g, "%5D");
}

export function copyToClipboardAsync(
  getData: () => Promise<string>,
): Promise<void> {
  return navigator.clipboard.write([
    new ClipboardItem({
      "text/plain": getData().then(
        (t) => new Blob([t], { type: "text/plain" }),
      ),
    }),
  ]);
}

/**
 * Deterministic hue (0-360) for a given string. djb2-style hash so similar
 * names (e.g. gpt-5.4 / gpt-5.4-mini) get noticeably different hues. Use this
 * to keep per-model colors stable across charts, log badges, reloads.
 */
export function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % 360;
}

/** Solid HSL color for a model name. Use for chart fills, lines, bars. */
export function modelColor(name: string): string {
  return `hsl(${nameToHue(name)} 70% 50%)`;
}

/** Badge style for a model name: tinted background + readable text color. */
export function modelColorStyle(name: string): {
  backgroundColor: string;
  color: string;
} {
  const hue = nameToHue(name);
  return {
    backgroundColor: `hsl(${hue} 85% 50% / 0.15)`,
    color: `hsl(${hue} 70% 40%)`,
  };
}

export function formatPrice(price: number): string {
  if (price === 0) return "$0.00";
  if (price >= 0.01) return `$${price.toFixed(2)}`;
  if (price >= 0.0001) return `$${price.toFixed(4).replace(/0+$/, "")}`;
  // Very small values: show first 2 significant digits
  const exp = Math.floor(Math.log10(price));
  const decimals = Math.min(-exp + 1, 10);
  return `$${price.toFixed(decimals)}`;
}

/** Compact token-count formatter: 200000 -> "200K", 1000000 -> "1M". */
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

/** Compact token-count formatter with K/M/B/T tiers. Zero/invalid -> "0". */
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

/** Format a 0..1 fraction as percentage with adaptive precision. */
export function formatShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return "0%";
  if (share < 0.001) return "<0.1%";
  return `${(share * 100).toFixed(share < 0.01 ? 2 : 1)}%`;
}

/** Latency in ms; switches to seconds at 1s. `decimals` controls seconds precision. */
export function formatLatency(ms: number, decimals = 2): string {
  if (!ms) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(decimals)}s`;
  return `${Math.round(ms)}ms`;
}

/** Tokens per second. `suffix` appended verbatim (e.g. "t/s"). */
export function formatTps(tps: number, suffix = ""): string {
  if (!tps) return "—";
  if (tps >= 100) return `${tps.toFixed(0)}${suffix}`;
  return `${tps.toFixed(1)}${suffix}`;
}

export function formatPct(pct: number, decimals = 2): string {
  if (!Number.isFinite(pct)) return "—";
  return `${pct.toFixed(decimals)}%`;
}

export function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export type StatIntent = "default" | "warning" | "success";

/** Map a success-rate percentage to a stat intent (success >= 99.9, default >= 99, else warning). */
export function successIntent(pct: number): StatIntent {
  if (pct >= 99.9) return "success";
  if (pct >= 99) return "default";
  return "warning";
}

export type LabeledRow = { label: string; value: ReactNode };

/** Build a `{ label, value }` row when `condition` is truthy; otherwise null. */
export function row(
  condition: unknown,
  label: string,
  value: ReactNode,
): LabeledRow | null {
  return condition ? { label, value } : null;
}

/** Safely unwrap an Orval-generated API response, throwing if data is null. */
export function unwrap<T extends { data: unknown }>(
  res: T,
): ExcludeVoid<NonNullable<T["data"]>> {
  if (res.data == null) throw new Error(msg("ERRORS.UNEXPECTED_RESPONSE"));
  // SAFETY: null-checked above; cast needed for generic return type
  return res.data as ExcludeVoid<NonNullable<T["data"]>>;
}

/**
 * Handles an Elysia/Eden treaty response:
 * - Throws on non-200 status
 * - Throws on { success: false } responses
 * - Unwraps { success: true, data: D } → D
 * - Returns direct data as-is
 */
export function handleElysia<T extends { data: unknown; status: number }>(
  response: T,
): UnwrapApiResponse<ExtractData<T>> {
  if (response.status !== 200) throw response;
  const body = response.data;
  if (body && typeof body === "object" && "success" in body) {
    const envelope = body as {
      success: boolean;
      data?: unknown;
      message?: string;
    };
    if (!envelope.success) {
      throw new Error(envelope.message ?? msg("ERRORS.REQUEST_FAILED"));
    }
    if ("data" in envelope) {
      // SAFETY: generic return type cannot be inferred from runtime checks
      return envelope.data as UnwrapApiResponse<ExtractData<T>>;
    }
  }
  // SAFETY: generic return type cannot be inferred from runtime checks
  return body as UnwrapApiResponse<ExtractData<T>>;
}
