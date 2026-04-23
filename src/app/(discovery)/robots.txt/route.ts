import { pathnames, privateRoutes, routing } from "@/i18n/routing";
import { env } from "@/lib/config/env";
import type { Locale } from "next-intl";

const siteOrigin = new URL(env.appUrl).origin;

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
      disallow.add(localizedPath(route, locale, false));
    }
  }
  for (const route of privateRoutes.dynamicParents) {
    for (const locale of routing.locales) {
      disallow.add(localizedPath(route, locale, true));
    }
  }
  return Array.from(disallow).sort();
}

export function GET() {
  const disallow = buildDisallowList();
  const lines: string[] = [
    "User-Agent: *",
    "Content-Signal: search=yes, ai-train=no, ai-input=yes",
    "Allow: /",
    ...disallow.map((path) => `Disallow: ${path}`),
    "",
    `Sitemap: ${siteOrigin}/sitemap.xml`,
    `Host: ${siteOrigin}`,
    "",
  ];
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
