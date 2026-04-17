import { pathnames, privateRoutes, routing } from "@/i18n/routing";
import { env } from "@/lib/config/env";
import type { MetadataRoute } from "next";
import type { Locale } from "next-intl";

const siteOrigin = new URL(env.appUrl).origin;

/** Resolve the localized form of a pathnames entry. Dynamic parents get a trailing slash so only children are blocked. */
function localizedPath(
  route: keyof typeof pathnames,
  locale: Locale,
  isDynamic: boolean,
): string {
  const config = pathnames[route] as string | Record<string, string>;
  const localized = typeof config === "string" ? config : config[locale] ?? route;
  const bracketAt = localized.indexOf("/[");
  const parent = bracketAt === -1 ? localized : localized.slice(0, bracketAt);
  return `/${locale}${parent}${isDynamic ? "/" : ""}`;
}

export default function robots(): MetadataRoute.Robots {
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

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: Array.from(disallow).sort(),
      },
    ],
    sitemap: `${siteOrigin}/sitemap.xml`,
    host: siteOrigin,
  };
}
