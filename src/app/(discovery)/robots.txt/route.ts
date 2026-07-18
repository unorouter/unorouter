import { pathnames, privateRoutes, routing } from "@/i18n/routing";
import { env } from "@/lib/config/env";
import type { Locale } from "next-intl";

function localizedPath(
  route: keyof typeof pathnames,
  locale: Locale,
  isDynamic: boolean,
): string {
  const config = pathnames[route] as string | Record<string, string>;
  const localized =
    typeof config === "string" ? config : (config[locale] ?? route);
  const bracketAt = localized.indexOf("/[");
  const parent = bracketAt === -1 ? localized : localized.slice(0, bracketAt);
  return `/${locale}${parent}${isDynamic ? "/" : ""}`;
}

function buildDisallowList(): string[] {
  // /*_rsc=: Next router-prefetch payloads. Googlebot executes the Link
  // prefetches while rendering and each fetch counts as a crawl - they were
  // 72% of all crawl requests in Search Console crawl stats, starving HTML
  // discovery. Page content is fully server-rendered, so blocking them
  // costs nothing.
  const disallow = new Set<string>(["/api/", "/*_rsc="]);
  for (const route of privateRoutes.static) {
    for (const locale of routing.locales) {
      const path = localizedPath(route, locale, false);
      disallow.add(`${path}$`);
      disallow.add(`${path}/`);
    }
  }
  for (const route of privateRoutes.dynamicParents) {
    for (const locale of routing.locales) {
      disallow.add(localizedPath(route, locale, true));
    }
  }
  return Array.from(disallow).sort();
}

function buildAllowList(): string[] {
  const allow = new Set<string>();
  for (const route of privateRoutes.publicChildren) {
    for (const locale of routing.locales) {
      allow.add(localizedPath(route, locale, false));
    }
  }
  return Array.from(allow).sort();
}

// AI answer engines convert far better than classic search; keep their
// crawlers explicitly allowed so GEO visibility never depends on the
// generic block or a CDN default flipping to block-AI.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
];

export function GET() {
  const disallow = buildDisallowList();
  const allow = buildAllowList();
  const lines: string[] = [
    ...AI_CRAWLERS.flatMap((bot) => [`User-Agent: ${bot}`, "Allow: /", ""]),
    "User-Agent: *",
    "Content-Signal: search=yes, ai-train=yes, ai-input=yes",
    "Allow: /",
    ...allow.map((path) => `Allow: ${path}`),
    ...disallow.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${env.siteOrigin}/sitemap.xml`,
    `Host: ${env.siteOrigin}`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
