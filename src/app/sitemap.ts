import { getPathname } from "@/i18n/navigation";
import { type Pathname, pathnames, routing } from "@/i18n/routing";
import type { MetadataRoute } from "next";
import type { Locale } from "next-intl";

export const revalidate = 3600;

type SitemapEntryOptions = {
  priority?: number;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
};

function getRoutePriority(route: string): SitemapEntryOptions {
  if (route === "/") {
    return { priority: 1.0, changeFrequency: "daily" };
  }
  if (["/models", "/pricing", "/docs"].includes(route)) {
    return { priority: 0.8, changeFrequency: "daily" };
  }
  if (route.startsWith("/docs/")) {
    return { priority: 0.7, changeFrequency: "weekly" };
  }
  return { priority: 0.5, changeFrequency: "weekly" };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = Object.keys(pathnames).filter(
    (route) => !route.includes("["),
  ) as (keyof typeof pathnames)[];

  const entries: MetadataRoute.Sitemap = [];

  for (const route of staticRoutes) {
    const options = getRoutePriority(route);
    entries.push(...getEntries(route as Pathname, options));
  }

  return entries;
}

function getEntries(
  href: Pathname,
  options?: SitemapEntryOptions,
): MetadataRoute.Sitemap {
  return routing.locales.map((locale) => ({
    url: getUrl(href, locale),
    lastModified: new Date(),
    ...(options?.priority !== undefined && { priority: options.priority }),
    ...(options?.changeFrequency && {
      changeFrequency: options.changeFrequency,
    }),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((cur) => [cur, getUrl(href, cur)]),
      ),
    },
  }));
}

function getUrl(href: Pathname, locale: Locale): string {
  const pathname = getPathname({ locale, href });
  return `${new URL(process.env.NEXT_PUBLIC_URL!).origin}${pathname}`;
}
