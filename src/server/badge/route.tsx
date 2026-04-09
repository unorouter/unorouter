/** @jsxImportSource @kitajs/html */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element, jsx-a11y/alt-text */

import { badgeQuery } from "@/lib/validation/badge";
import { html } from "@elysiajs/html";
import { Elysia } from "elysia";
import { getPricingData, getStats } from "./cache";
import { parseLocale } from "./i18n";
import { parseTheme } from "./satori";
import { generateHero } from "./svg/hero";
import { generatePricing } from "./svg/pricing";
import { generateProviders } from "./svg/providers";
import { generateReferral } from "./svg/referral";
import { generateSponsor } from "./svg/sponsor";
import { generateTokensBanner } from "./svg/tokens-banner";
import { generateTokensSquare } from "./svg/tokens-square";

const SVG_HEADERS = {
  "content-type": "image/svg+xml; charset=utf-8",
  "cache-control": "public, max-age=300, s-maxage=300",
};

function AllPage(props: {
  bg: string;
  fg: string;
  muted: string;
  badges: { name: string; svg: string }[];
}) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Badge Preview</title>
        <style>{`
body{background:${props.bg};color:${props.fg};font-family:system-ui;padding:40px}
.grid{display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start}
.badge{flex:0 0 auto}
h2{margin:0 0 8px;font-size:14px;color:${props.muted};text-transform:uppercase;letter-spacing:1px}
svg{display:block;max-width:100%;height:auto}
        `}</style>
      </head>
      <body>
        <div class="grid">
          {props.badges.map((b) => (
            <div class="badge">
              <h2>{b.name}</h2>
              {b.svg}
            </div>
          ))}
        </div>
      </body>
    </html>
  );
}

export const badgeRoute = new Elysia({ prefix: "/badge" })
  .use(html({ autoDetect: false, autoDoctype: false }))
  .onBeforeHandle(({ set, path }) => {
    if (!path.endsWith("/all")) {
      Object.assign(set.headers, SVG_HEADERS);
    }
  })
  .get(
    "/banner",
    async ({ query }) => {
      const stats = await getStats();
      return generateTokensBanner(
        stats,
        parseLocale(query.locale),
        parseTheme(query.theme),
        query.ref,
      );
    },
    { query: badgeQuery },
  )
  .get(
    "/square",
    async ({ query }) => {
      const stats = await getStats();
      return generateTokensSquare(
        stats,
        parseLocale(query.locale),
        parseTheme(query.theme),
        query.ref,
      );
    },
    { query: badgeQuery },
  )
  .get(
    "/sponsor",
    async ({ query }) => {
      const stats = await getStats();
      return generateSponsor(
        stats,
        parseLocale(query.locale),
        parseTheme(query.theme),
        query.ref,
      );
    },
    { query: badgeQuery },
  )
  .get(
    "/providers",
    async ({ query }) => {
      const pricing = await getPricingData();
      return generateProviders(
        parseLocale(query.locale),
        parseTheme(query.theme),
        pricing.vendorNames,
      );
    },
    { query: badgeQuery },
  )
  .get(
    "/pricing",
    async ({ query }) => {
      const pricing = await getPricingData();
      return generatePricing(
        parseLocale(query.locale),
        parseTheme(query.theme),
        pricing.rows,
      );
    },
    { query: badgeQuery },
  )
  .get(
    "/hero",
    async ({ query }) => {
      const stats = await getStats();
      return generateHero(
        stats,
        parseLocale(query.locale),
        parseTheme(query.theme),
        query.ref,
      );
    },
    { query: badgeQuery },
  )
  .get(
    "/referral",
    async ({ query }) =>
      generateReferral(
        parseLocale(query.locale),
        parseTheme(query.theme),
        query.ref ?? "YOUR_CODE",
      ),
    { query: badgeQuery },
  )
  .get(
    "/all",
    async ({ query, html }) => {
      const locale = parseLocale(query.locale);
      const theme = parseTheme(query.theme);
      const ref = query.ref;
      const [stats, pricing] = await Promise.all([
        getStats(),
        getPricingData(),
      ]);

      const badges = await Promise.all([
        { name: "banner", svg: generateTokensBanner(stats, locale, theme, ref) },
        { name: "square", svg: generateTokensSquare(stats, locale, theme, ref) },
        { name: "sponsor", svg: generateSponsor(stats, locale, theme, ref) },
        { name: "providers", svg: generateProviders(locale, theme, pricing.vendorNames) },
        { name: "pricing", svg: generatePricing(locale, theme, pricing.rows) },
        { name: "hero", svg: generateHero(stats, locale, theme, ref) },
        { name: "referral", svg: generateReferral(locale, theme, ref ?? "YOUR_CODE") },
      ].map(async (b) => ({ name: b.name, svg: await b.svg })));

      const isLight = query.theme === "light";

      return html(
        <AllPage
          bg={isLight ? "#fff" : "#111"}
          fg={isLight ? "#000" : "#fff"}
          muted={isLight ? "#666" : "#888"}
          badges={badges}
        />,
      );
    },
    { query: badgeQuery },
  );
