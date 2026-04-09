import { badgeQuery } from "@/lib/validation/badge";
import { Elysia } from "elysia";
import { getStats } from "./cache";
import { parseLocale } from "./i18n";
import { parseTheme } from "./satori";
import { generateHero } from "./svg/hero";
import { generatePricing } from "./svg/pricing";
import { generateProviders } from "./svg/providers";
import { generateSponsor } from "./svg/sponsor";
import { generateTokensBanner } from "./svg/tokens-banner";
import { generateTokensSquare } from "./svg/tokens-square";

const SVG_HEADERS = {
  "content-type": "image/svg+xml; charset=utf-8",
  "cache-control": "public, max-age=300, s-maxage=300",
};

const BADGE_NAMES = [
  "banner",
  "square",
  "sponsor",
  "providers",
  "pricing",
  "hero",
] as const;

export const badgeRoute = new Elysia({ prefix: "/badge" })
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
    async ({ query }) =>
      generateProviders(parseLocale(query.locale), parseTheme(query.theme)),
    { query: badgeQuery },
  )
  .get(
    "/pricing",
    async ({ query }) =>
      generatePricing(parseLocale(query.locale), parseTheme(query.theme)),
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
    "/all",
    ({ query, set }) => {
      set.headers["content-type"] = "text/html; charset=utf-8";

      const qs = new URLSearchParams();
      if (query.locale) qs.set("locale", query.locale);
      if (query.theme) qs.set("theme", query.theme);
      if (query.ref) qs.set("ref", query.ref);
      const qsStr = qs.toString() ? `?${qs.toString()}` : "";

      return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Badge Preview</title>
<style>
body{background:#111;color:#fff;font-family:system-ui;padding:40px}
.grid{display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start}
.badge{flex:0 0 auto}
h2{margin:0 0 8px;font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px}
img{display:block;max-width:100%;height:auto}
</style></head><body>
<div class="grid">
${BADGE_NAMES.map((name) => `<div class="badge"><h2>${name}</h2><img src="/api/badge/${name}${qsStr}" /></div>`).join("\n")}
</div>
</body></html>`;
    },
    { query: badgeQuery },
  );
