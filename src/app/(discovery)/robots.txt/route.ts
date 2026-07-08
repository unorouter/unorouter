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
  const disallow = new Set<string>(["/api/"]);
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

export function GET() {
  const disallow = buildDisallowList();
  const allow = buildAllowList();
  const lines: string[] = [
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
