import { pathnames, privateRoutes, routing } from "@/i18n/routing";
import { env } from "@/lib/config/env";
import type { MetadataRoute } from "next";
import type { Locale } from "next-intl";

const siteOrigin = new URL(env.appUrl).origin;

/** Resolve the localized form of a pathnames entry, stripping any [param] segments. */
function localizedParent(route: keyof typeof pathnames, locale: Locale): string {
  const config = pathnames[route] as string | Record<string, string>;
  const localized = typeof config === "string" ? config : config[locale] ?? route;
  const bracketAt = localized.indexOf("/[");
  const parent = bracketAt === -1 ? localized : localized.slice(0, bracketAt);
  return `/${locale}${parent}`;
}

export default function robots(): MetadataRoute.Robots {
  const disallow = new Set<string>(["/api/"]);
  for (const route of [...privateRoutes.static, ...privateRoutes.dynamicParents]) {
    for (const locale of routing.locales) {
      disallow.add(localizedParent(route, locale));
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
