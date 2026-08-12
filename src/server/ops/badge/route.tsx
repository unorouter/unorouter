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
import { findBadgeModel, getPricingData, getStats } from "./lib/cache";
import { loadSharp } from "@/server/sharp-loader";
import { logger } from "@/lib/utils/logger";
import { errMessage } from "@/lib/utils/base";
import { THEME_COLORS } from "./lib/theme";
import type { BadgeCtx } from "./lib/types";
import { AllPage, type PreviewGroup } from "./templates/all-page";
import { generateBrand } from "./templates/brand";
import { generateChat } from "./templates/chat";
import { generateCompare } from "./templates/compare";
import { generateHero } from "./templates/hero";
import { generateModel } from "./templates/model";
import { generatePricing } from "./templates/pricing";
import { generateProviders } from "./templates/providers";
import { generateReferral } from "./templates/referral";
import { generateSocial } from "./templates/social";
import { generateSponsor } from "./templates/sponsor";
import { generateTester } from "./templates/tester";
import { generateTokensBanner } from "./templates/tokens-banner";
import { generateTokensSquare } from "./templates/tokens-square";

const HTML_HEADERS = { "content-type": "text/html; charset=utf-8" } as const;
function htmlResponse(body: JSX.Element): Response {
  return new Response(body as unknown as BodyInit, { headers: HTML_HEADERS });
}

// sharp's SVG loader can fail at runtime in a long-lived process (loader poisoning: the
// same buffer converts fine in a fresh process on the same pod). Every og:image then 500s
// silently because nothing logged here. Serve the SVG instead and make the failure loud.
async function pngResponse(svg: string): Promise<Response> {
  try {
    const png = await svgToPng(svg);
    return new Response(new Uint8Array(png), { headers: PNG_HEADERS });
  } catch (err) {
    logger.error("badge svg->png failed, serving svg fallback", {
      context: "badge",
      message: errMessage(err),
    });
    return new Response(svg, { headers: SVG_HEADERS });
  }
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
  chat: generateChat,
  tester: generateTester,
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

      if (params.name === "social") {
        const pricing = await getPricingData();
        const socialSvg = await generateSocial({
          theme,
          size: size as SocialSize,
          staticMode: isPng,
          modelCount: pricing.modelCount,
        });
        if (isPng) return pngResponse(socialSvg);
        return socialSvg;
      }

      if (params.name === "model" || params.name === "compare") {
        const [stats, pricing] = await Promise.all([
          getStats(),
          getPricingData(),
        ]);
        const ctx: BadgeCtx = {
          locale,
          theme,
          size: "og",
          ref: query.ref,
          stats,
          pricing,
          staticMode: isPng,
        };
        let svg: string;
        if (params.name === "model") {
          const requested = query.model ?? "";
          svg = await generateModel(
            ctx,
            await findBadgeModel(requested),
            requested,
          );
        } else {
          const requested = (query.models ?? "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 2);
          const pair = await Promise.all(
            requested.map(async (r) => ({
              requested: r,
              model: await findBadgeModel(r),
            })),
          );
          svg = await generateCompare(ctx, pair);
        }
        if (isPng) return pngResponse(svg);
        return svg;
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

      if (isPng) return pngResponse(svg);
      return svg;
    },
    { query: badgeQuery },
  );
