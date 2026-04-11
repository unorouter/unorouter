/** @jsxImportSource @kitajs/html */
/* eslint-disable @next/next/no-head-element, @next/next/no-img-element, jsx-a11y/alt-text */

import { badgeQuery } from "@/lib/validation/badge";
import { html } from "@elysiajs/html";
import { Elysia } from "elysia";
import type { Locale } from "next-intl";
import type { BadgePricing, BadgeStats } from "./cache";
import { getPricingData, getStats } from "./cache";
import { parseLocale } from "./i18n";
import { parseTheme, type Theme } from "./lib/theme";
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

// ── Badge registry ────────────────────────────────────────

interface BadgeCtx {
  locale: Locale;
  theme: Theme;
  ref?: string;
  stats: BadgeStats;
  pricing: BadgePricing;
}

const BADGES: Record<string, (ctx: BadgeCtx) => Promise<string>> = {
  banner: (c) => generateTokensBanner(c.stats, c.locale, c.theme, c.ref),
  square: (c) => generateTokensSquare(c.stats, c.locale, c.theme, c.ref),
  sponsor: (c) => generateSponsor(c.stats, c.locale, c.theme, c.pricing, c.ref),
  providers: (c) => generateProviders(c.locale, c.theme, c.pricing.vendorNames),
  pricing: (c) => generatePricing(c.locale, c.theme, c.pricing.rows),
  hero: (c) => generateHero(c.stats, c.locale, c.theme, c.pricing, c.ref),
  referral: (c) => generateReferral(c.locale, c.theme, c.ref ?? "YOUR_CODE"),
};

const BADGE_NAMES = Object.keys(BADGES);

// ── /all preview page ─────────────────────────────────────

function copyScript(name: string, qsStr: string): string {
  return [
    `navigator.clipboard.writeText(location.origin+'/api/badge/${name}${qsStr}')`,
    `.then(()=>{`,
    `let t=document.getElementById('toast');`,
    `t.textContent='Copied: /api/badge/${name}';`,
    `t.classList.add('show');`,
    `setTimeout(()=>t.classList.remove('show'),1500)`,
    `})`,
  ].join("");
}

function AllPage(props: {
  bg: string;
  fg: string;
  muted: string;
  qsStr: string;
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
.header{display:flex;align-items:center;gap:8px;margin:0 0 8px}
.header a{font-size:14px;color:${props.muted};text-transform:uppercase;letter-spacing:1px;text-decoration:none;transition:color 0.15s}
.header a:hover{color:${props.fg}}
.header:hover .copy{opacity:0.7}
.copy{background:none;border:none;cursor:pointer;padding:4px;display:inline-flex;align-items:center;color:${props.muted};opacity:0.6;transition:opacity 0.15s,color 0.15s}
.copy:hover{opacity:1;color:${props.fg}}
.copy-icon{width:16px;height:16px;filter:invert(${props.bg === "#111" ? "1" : "0"}) opacity(0.5)}
.copy:hover .copy-icon{filter:invert(${props.bg === "#111" ? "1" : "0"}) opacity(1)}
.badge img.badge-img{display:block;max-width:100%;height:auto}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#22c55e;color:#000;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;opacity:0;transition:opacity 0.2s;pointer-events:none}
.toast.show{opacity:1}
        `}</style>
      </head>
      <body>
        <div class="grid">
          {props.badges.map((b) => (
            <div class="badge">
              <div class="header">
                <a href={`/api/badge/${b.name}${props.qsStr}`} target="_blank">
                  {b.name}
                </a>
                <button
                  class="copy"
                  onclick={copyScript(b.name, props.qsStr)}
                  title="Copy badge URL"
                >
                  <img
                    class="copy-icon"
                    src="/icons/copy.svg"
                    width="16"
                    height="16"
                  />
                </button>
              </div>
              <img
                class="badge-img"
                src={`data:image/svg+xml;base64,${Buffer.from(b.svg).toString("base64")}`}
              />
            </div>
          ))}
        </div>
        <div id="toast" class="toast" />
      </body>
    </html>
  );
}

// ── Routes ────────────────────────────────────────────────

export const badgeRoute = new Elysia({ prefix: "/badge" })
  .use(html({ autoDetect: false, autoDoctype: false }))
  .resolve({ as: "local" }, ({ query }) => ({
    locale: parseLocale(query.locale),
    theme: parseTheme(query.theme),
  }))
  .onBeforeHandle(({ set, path }) => {
    if (!path.endsWith("/all")) {
      Object.assign(set.headers, SVG_HEADERS);
    }
  })
  .get(
    "/all",
    async ({ query, html, locale, theme }) => {
      const qs = new URLSearchParams();
      if (query.locale) qs.set("locale", query.locale);
      if (query.theme) qs.set("theme", query.theme);
      if (query.ref) qs.set("ref", query.ref);
      const qsStr = qs.toString() ? `?${qs.toString()}` : "";

      const [stats, pricing] = await Promise.all([
        getStats(),
        getPricingData(),
      ]);

      const ctx: BadgeCtx = { locale, theme, ref: query.ref, stats, pricing };
      const badges = await Promise.all(
        BADGE_NAMES.map(async (name) => ({
          name,
          svg: await BADGES[name](ctx),
        })),
      );

      const isLight = query.theme === "light";

      return html(
        <AllPage
          bg={isLight ? "#fff" : "#111"}
          fg={isLight ? "#000" : "#fff"}
          muted={isLight ? "#666" : "#888"}
          qsStr={qsStr}
          badges={badges}
        />,
      );
    },
    { query: badgeQuery },
  )
  .get(
    "/:name",
    async ({ params, query, locale, theme, set }) => {
      const gen = BADGES[params.name];
      if (!gen) {
        set.status = 404;
        return "Unknown badge";
      }
      const [stats, pricing] = await Promise.all([
        getStats(),
        getPricingData(),
      ]);
      return gen({ locale, theme, ref: query.ref, stats, pricing });
    },
    { query: badgeQuery },
  );
