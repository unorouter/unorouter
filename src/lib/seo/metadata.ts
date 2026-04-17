import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { type Pathname, routing } from "@/i18n/routing";
import { LANGUAGES, LOCALES } from "../config/constants";
import { env } from "../config/env";
import type { BadgeFormat, BadgeType, Theme } from "../validation/badge";

function buildAlternateLanguages(href: Pathname): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = getPathname({ locale: loc, href });
  }
  languages["x-default"] = getPathname({ locale: LOCALES[0], href });
  return languages;
}

export function ogBadge(
  variant: BadgeType,
  locale: string,
  opts: { theme?: Theme; format?: BadgeFormat } = {},
) {
  const theme: Theme = opts.theme ?? "dark";
  const format: BadgeFormat = opts.format ?? "png";
  return `/api/badge/${variant}?format=${format}&theme=${theme}&locale=${locale}&size=og`;
}

type MetadataParams = {
  locale: Locale;
  href: Pathname;
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
  robots?: boolean;
};

export function getPageMetadata(params: MetadataParams): Metadata {
  const canonicalPath = getPathname({ locale: params.locale, href: params.href });
  const shouldIndex = params.robots ?? true;
  const ogImageUrl = params.ogImage ?? ogBadge("hero", params.locale);

  return {
    metadataBase: new URL(env.appUrl),
    title: params.title,
    description: params.description,
    keywords: params.keywords.split(", "),
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: { url: "/apple-icon.png", sizes: "180x180" },
    },
    manifest: `/${params.locale}/manifest.webmanifest`,
    ...(env.googleSiteVerification && {
      verification: { google: env.googleSiteVerification },
    }),
    alternates: {
      canonical: canonicalPath,
      languages: buildAlternateLanguages(params.href),
      types: {
        "application/rss+xml": `/${params.locale}/blog/feed.xml`,
      },
    },
    openGraph: {
      title: params.title,
      description: params.description,
      type: "website",
      locale: LANGUAGES.find((l) => l.code === params.locale.toUpperCase())
        ?.ogLocale,
      alternateLocale: LANGUAGES.map((l) => l.ogLocale),
      siteName: env.appName,
      images: [
        {
          url: ogImageUrl,
          alt: params.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: params.title,
      description: params.description,
      ...(env.twitterHandle && {
        site: env.twitterHandle,
        creator: env.twitterHandle,
      }),
      images: [
        {
          url: ogImageUrl,
          alt: params.title,
        },
      ],
    },
    robots: {
      index: shouldIndex,
      follow: shouldIndex,
      nocache: !shouldIndex,
      googleBot: {
        index: shouldIndex,
        follow: shouldIndex,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}
