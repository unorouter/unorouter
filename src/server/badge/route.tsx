/** @jsxImportSource @kitajs/html */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element, jsx-a11y/alt-text */

import {
  badgeQuery,
  parseBadgeSize,
  type BadgeSize,
} from "@/lib/validation/badge";
import { html } from "@elysiajs/html";
import { Elysia } from "elysia";
import type { Locale } from "next-intl";
import sharp from "sharp";
import type { BadgePricing, BadgeStats } from "./cache";
import { getPricingData, getStats } from "./cache";
import { parseLocale } from "./i18n";
import { parseTheme, themeVars, type Theme } from "./lib/theme";
import { AllPage } from "./templates/all-page";
import { setStaticMode } from "./templates/cipher";
import { generateHero } from "./templates/hero";
import { generatePricing } from "./templates/pricing";
import { generateProviders } from "./templates/providers";
import { generateReferral } from "./templates/referral";
import { generateSponsor } from "./templates/sponsor";
import { generateTokensBanner } from "./templates/tokens-banner";
import { generateTokensSquare } from "./templates/tokens-square";

const SVG_HEADERS = {
  "content-type": "image/svg+xml; charset=utf-8",
  "cache-control": "public, max-age=300, s-maxage=300",
};

const PNG_HEADERS = {
  "content-type": "image/png",
  "cache-control": "public, max-age=300, s-maxage=300",
};

// ── Badge registry ────────────────────────────────────────

export interface BadgeCtx {
  locale: Locale;
  theme: Theme;
  size: BadgeSize;
  ref?: string;
  stats: BadgeStats;
  pricing: BadgePricing;
}

const BADGES: Record<string, (ctx: BadgeCtx) => Promise<string>> = {
  banner: generateTokensBanner,
  square: generateTokensSquare,
  sponsor: generateSponsor,
  providers: generateProviders,
  pricing: generatePricing,
  hero: generateHero,
  referral: generateReferral,
};

const BADGE_NAMES = Object.keys(BADGES);

// ── Routes ────────────────────────────────────────────────

export const badgeRoute = new Elysia({ prefix: "/badge" })
  .use(html({ autoDetect: false, autoDoctype: false }))
  .resolve({ as: "local" }, ({ query }) => ({
    locale: parseLocale(query.locale),
    theme: parseTheme(query.theme),
    size: parseBadgeSize(query.size),
  }))
  .onBeforeHandle(({ set, path }) => {
    if (!path.endsWith("/all")) {
      Object.assign(set.headers, SVG_HEADERS);
    }
  })
  .get(
    "/all",
    async ({ query, html, locale, theme, size: _size }) => {
      const qs = new URLSearchParams();
      if (query.locale) qs.set("locale", query.locale);
      if (query.theme) qs.set("theme", query.theme);
      if (query.ref) qs.set("ref", query.ref);
      const qsStr = qs.toString() ? `?${qs.toString()}` : "";

      const [stats, pricing] = await Promise.all([
        getStats(),
        getPricingData(),
      ]);

      const sizes: BadgeSize[] = ["xs", "sm", "md", "lg", "xl"];
      const allBadges = await Promise.all(
        sizes.map(async (s) => {
          const ctx: BadgeCtx = {
            locale,
            theme,
            size: s,
            ref: query.ref,
            stats,
            pricing,
          };
          const badges = await Promise.all(
            BADGE_NAMES.map(async (name) => ({
              name: `${name} (${s})`,
              svg: await BADGES[name](ctx),
            })),
          );
          return badges;
        }),
      );

      const c = themeVars(theme);

      return html(
        <AllPage
          bg={c.previewBg}
          fg={c.previewFg}
          muted={c.previewMuted}
          qsStr={qsStr}
          badges={allBadges.flat()}
        />,
      );
    },
    { query: badgeQuery },
  )
  .get(
    "/:name",
    async ({ params, query, locale, theme, size, set }) => {
      const gen = BADGES[params.name];
      if (!gen) {
        set.status = 404;
        return "Unknown badge";
      }
      const [stats, pricing] = await Promise.all([
        getStats(),
        getPricingData(),
      ]);
      const isPng = query.format === "png";
      if (isPng) setStaticMode(true);
      const svg = await gen({
        locale,
        theme,
        size,
        ref: query.ref,
        stats,
        pricing,
      });
      if (isPng) setStaticMode(false);

      if (isPng) {
        const png = await sharp(Buffer.from(svg)).png().toBuffer();
        return new Response(new Uint8Array(png), { headers: PNG_HEADERS });
      }

      return svg;
    },
    { query: badgeQuery },
  );
