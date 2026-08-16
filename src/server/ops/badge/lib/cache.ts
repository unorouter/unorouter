import type { ProcessedModel } from "@/lib/api/pricing";
import { modelMatchesSlug } from "@/lib/utils/base";
import { LOCALES } from "@/lib/config/constants";
import { errMessage } from "@/lib/utils/base";
import { logger } from "@/lib/utils/logger";
import { computeStatsSummary } from "@/server/ops/stats/stats.service";
import { readFileSync } from "fs";
import type { Locale } from "next-intl";
import { join } from "path";
import type { SatoriOptions } from "satori";
import { createTranslator } from "use-intl/core";
import { getPricingSnapshot } from "@/server/models/pricing/pricing-snapshot";
import type { BadgePricing, BadgeStats } from "./types";

const logoSvg = readFileSync(
  join(process.cwd(), "public", "images", "logo", "logo.svg"),
  "utf-8",
);

export const logoDataUri = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

export const logoInnerSvg =
  logoSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1].trim() ?? "";

const fontsDir = join(process.cwd(), "src", "server", "ops", "badge", "fonts");

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

const EMPTY_STATS: BadgeStats = { tokenUsed: 0, requestCount: 0, avgTpm: 0 };

// A dead upstream must not kill badges; they render with zeros instead.
export async function getStats(): Promise<BadgeStats> {
  try {
    const summary = await computeStatsSummary();
    return {
      tokenUsed: summary.token_used,
      requestCount: summary.count,
      avgTpm: summary.avg_tpm,
    };
  } catch (err) {
    logger.warn("badge getStats: upstream failed, falling back to zero", {
      context: "badge",
      message: errMessage(err),
    });
    return EMPTY_STATS;
  }
}

export async function findBadgeModel(
  nameOrSlug: string,
): Promise<ProcessedModel | null> {
  const { models } = await getPricingSnapshot();
  return models.find((m) => modelMatchesSlug(m.name, nameOrSlug)) ?? null;
}

export async function getPricingData(): Promise<BadgePricing> {
  const { summary } = await getPricingSnapshot();
  const vendorModelCounts: Record<string, number> = {};
  for (const v of summary.vendors) {
    vendorModelCounts[v.name] = v.modelCount;
  }
  return {
    modelCount: summary.modelCount,
    freeCount: summary.freeCount,
    paidCount: summary.paidCount,
    vendorCount: summary.vendorCount,
    vendorNames: summary.vendorNames,
    vendorModelCounts,
    rows: summary.topDiscounted,
  };
}
