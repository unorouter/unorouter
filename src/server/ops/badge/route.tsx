/** @jsxImportSource @kitajs/html */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element, jsx-a11y/alt-text */

import { APP_VALUES } from "@/lib/config/constants";
import {
  BADGE_SIZES,
  BADGE_TYPES,
  SOCIAL_SIZES,
  badgeQuery,
  type BadgeType,
  type SocialSize,
} from "@/lib/validation/badge";
import { Elysia } from "elysia";
import { getTranslations } from "next-intl/server";
import { getPricingData, getStats } from "./lib/cache";
import { loadSharp } from "./lib/sharp-loader";
import { THEME_COLORS } from "./lib/theme";
import type { BadgeCtx } from "./lib/types";
import { AllPage, type PreviewGroup } from "./templates/all-page";
import { generateBrand } from "./templates/brand";
import { generateHero } from "./templates/hero";
import { generatePricing } from "./templates/pricing";
import { generateProviders } from "./templates/providers";
import { generateReferral } from "./templates/referral";
import { generateSocial } from "./templates/social";
import { generateSponsor } from "./templates/sponsor";
import { generateTokensBanner } from "./templates/tokens-banner";
import { generateTokensSquare } from "./templates/tokens-square";

const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" } as const;
function htmlResponse(body: JSX.Element): Response {
  // @kitajs/html renders to a string at runtime but is typed JSX.Element.
  return new Response(body as unknown as BodyInit, { headers: HTML_HEADERS });
}

const CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=60";

const SVG_HEADERS = {
  "content-type": "image/svg+xml; charset=utf-8",
  "cache-control": CACHE_CONTROL,
  "cross-origin-resource-policy": "cross-origin",
};

const PNG_HEADERS = {
  "content-type": "image/png",
  "cache-control": CACHE_CONTROL,
  "cross-origin-resource-policy": "cross-origin",
};

// http://localhost:3000/api/ops/badge/all?theme=dark

async function svgToPng(svg: string): Promise<Buffer> {
  return loadSharp()(Buffer.from(svg)).png().toBuffer();
}

const BADGES: Record<BadgeType, (ctx: BadgeCtx) => Promise<string>> = {
  banner: generateTokensBanner,
  square: generateTokensSquare,
  sponsor: generateSponsor,
  providers: generateProviders,
  pricing: generatePricing,
  hero: generateHero,
  referral: generateReferral,
  brand: generateBrand,
};

export const badgeRoute = new Elysia({ prefix: "/badge" })
  .resolve({ as: "local" }, ({ query }) => ({
    locale: query.locale as BadgeCtx["locale"],
    theme: query.theme as BadgeCtx["theme"],
    size: query.size as BadgeCtx["size"],
  }))
  .onBeforeHandle(({ set, path }) => {
    if (!path.endsWith("/all")) {
      Object.assign(set.headers, SVG_HEADERS);
    }
  })
  .get(
    "/all",
    async ({ query, locale, theme, size: _size }) => {
      const shared = {
        locale: query.locale,
        theme: query.theme,
        ref: query.ref,
      };

      const [stats, pricing, t] = await Promise.all([
        getStats(),
        getPricingData(),
        getTranslations({ locale }),
      ]);

      const sizes = BADGE_SIZES;
      const filteredTypes = query.type
        ? BADGE_TYPES.filter((n) => n === query.type)
        : BADGE_TYPES;
      const allBadges: PreviewGroup[] = await Promise.all(
        filteredTypes.map(async (name) => {
          const badges = await Promise.all(
            sizes.map(async (s) => {
              const ctx: BadgeCtx = {
                locale,
                theme,
                size: s,
                ref: query.ref,
                stats,
                pricing,
              };
              return {
                size: s,
                label: `${name} (${s})`,
                svg: await BADGES[name](ctx),
              };
            }),
          );
          return { type: name, badges };
        }),
      );

      // Social banners: own sizes, no stats/pricing. Append as one group unless a
      // different type filter is set.
      if (!query.type) {
        const socialBadges = await Promise.all(
          SOCIAL_SIZES.map(async (s) => ({
            size: s,
            label: `social (${s})`,
            svg: await generateSocial({
              theme,
              size: s,
              modelCount: pricing.modelCount,
            }),
          })),
        );
        allBadges.push({ type: "social", badges: socialBadges });
      }

      const c = THEME_COLORS[theme];
      return htmlResponse(
        <AllPage
          bg={c.previewBg}
          fg={c.previewFg}
          muted={c.previewMuted}
          shared={shared}
          groups={allBadges}
          badgeAlt={t("AFFILIATE.BADGE_GENERATOR.BADGE_ALT", APP_VALUES)}
        />,
      );
    },
    { query: badgeQuery },
  )
  .get(
    "/:name",
    async ({ params, query, locale, theme, size, set }) => {
      const isPng = query.format === "png";

      // Social banners stand apart from the user-facing badge grid: their own
      // sizes (SOCIAL_SIZES), no stats/pricing, excluded from /all + generator.
      if (params.name === "social") {
        const pricing = await getPricingData();
        const socialSvg = await generateSocial({
          theme,
          size: size as SocialSize,
          staticMode: isPng,
          modelCount: pricing.modelCount,
        });
        if (isPng) {
          const png = await svgToPng(socialSvg);
          return new Response(new Uint8Array(png), { headers: PNG_HEADERS });
        }
        return socialSvg;
      }

      const gen = BADGES[params.name as BadgeType];
      if (!gen) {
        set.status = 404;
        return "Unknown badge";
      }

      const [stats, pricing] = await Promise.all([
        getStats(),
        getPricingData(),
      ]);
      const svg = await gen({
        locale,
        theme,
        size,
        ref: query.ref,
        stats,
        pricing,
        staticMode: isPng,
      });

      if (isPng) {
        const png = await svgToPng(svg);
        return new Response(new Uint8Array(png), { headers: PNG_HEADERS });
      }
      return svg;
    },
    { query: badgeQuery },
  );
