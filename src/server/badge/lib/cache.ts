import { buildPricingSummary } from "@/lib/api/pricing";
import { FAR_FUTURE, LOCALES } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { getAllQuotaDates, getPricing } from "@/openapi";
import { readFileSync } from "fs";
import type { Locale } from "next-intl";
import { join } from "path";
import type { SatoriOptions } from "satori";
import { createTranslator } from "use-intl/core";
import { ADMIN_HEADERS } from "../../constants";
import type { BadgePricing, BadgeStats } from "./types";

/* ── logo ── */

const logoSvg = readFileSync(
  join(process.cwd(), "public", "images", "logo", "logo.svg"),
  "utf-8",
);

export const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

export const logoInnerSvg =
  logoSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1].trim() ?? "";

/* ── fonts ── */

const fontsDir = join(process.cwd(), "src", "server", "badge", "fonts");

export const fonts: SatoriOptions["fonts"] = [
  {
    name: "Space Grotesk",
    data: readFileSync(join(fontsDir, "space-grotesk-400.ttf")),
    weight: 400 as const,
    style: "normal" as const,
  },
  {
    name: "Space Grotesk",
    data: readFileSync(join(fontsDir, "space-grotesk-700.ttf")),
    weight: 700 as const,
    style: "normal" as const,
  },
  {
    name: "JetBrains Mono",
    data: readFileSync(join(fontsDir, "jetbrains-mono-700.ttf")),
    weight: 700 as const,
    style: "normal" as const,
  },
];

/* ── i18n ── */

const translatorCache = new Map<Locale, ReturnType<typeof createTranslator>>();

function getTranslator(locale: Locale) {
  const cached = translatorCache.get(locale);
  if (cached) return cached;

  const path = join(process.cwd(), "public", "i18n", `${locale}.json`);
  const messages = JSON.parse(readFileSync(path, "utf-8"));
  const translator = createTranslator({ locale, messages });
  translatorCache.set(locale, translator);
  return translator;
}

export function t(locale: Locale, key: string): string {
  const translator = getTranslator(locale);
  try {
    return translator(key as never);
  } catch {
    if (locale !== LOCALES[0]) {
      const en = getTranslator(LOCALES[0]);
      return en(key as never);
    }
    return key;
  }
}

/* ── stats & pricing ── */

let cachedStats: BadgeStats | null = null;
let cachedStatsAt = 0;
let cachedPricing: BadgePricing | null = null;
let cachedPricingAt = 0;
const CACHE_TTL = 5 * 60 * 1000;

const EMPTY_STATS: BadgeStats = { tokenUsed: 0, requestCount: 0, avgTpm: 0 };

export async function getStats(): Promise<BadgeStats> {
  if (cachedStats && Date.now() - cachedStatsAt < CACHE_TTL) return cachedStats;

  const now = Math.floor(Date.now() / 1000);
  let body;
  try {
    const res = await getAllQuotaDates(
      { start_timestamp: 0, end_timestamp: FAR_FUTURE },
      { headers: ADMIN_HEADERS },
    );
    if (res.status !== 200) {
      logger.warn("badge getStats: upstream non-200, falling back to zero", {
        context: "badge",
        status: res.status,
      });
      cachedStats = EMPTY_STATS;
      cachedStatsAt = Date.now();
      return cachedStats;
    }
    body = unwrap(res);
  } catch (err) {
    logger.warn("badge getStats: upstream failed, falling back to zero", {
      context: "badge",
      message: err instanceof Error ? err.message : String(err),
    });
    cachedStats = EMPTY_STATS;
    cachedStatsAt = Date.now();
    return cachedStats;
  }
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

  cachedStats = { tokenUsed, requestCount, avgTpm };
  cachedStatsAt = Date.now();
  return cachedStats;
}

export async function getPricingData(): Promise<BadgePricing> {
  if (cachedPricing && Date.now() - cachedPricingAt < CACHE_TTL)
    return cachedPricing;

  const res = await getPricing();
  const summary = buildPricingSummary(unwrap(res));

  const vendorModelCounts: Record<string, number> = {};
  for (const v of summary.vendors) {
    vendorModelCounts[v.name] = v.modelCount;
  }

  cachedPricing = {
    modelCount: summary.modelCount,
    vendorCount: summary.vendorCount,
    vendorNames: summary.vendorNames,
    vendorModelCounts,
    rows: summary.topDiscounted,
  };
  cachedPricingAt = Date.now();
  return cachedPricing;
}
