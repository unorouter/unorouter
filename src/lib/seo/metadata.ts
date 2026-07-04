import { getPathname } from "@/i18n/navigation";
import { type Pathname, routing } from "@/i18n/routing";
import type { SeoTimestampSlug } from "@/i18n/registry";
import { dayjs } from "@/lib/utils/format/date";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { LANGUAGES, LOCALES } from "../config/constants";
import { env } from "../config/env";
import rawTimestamps from "../../../public/seo-timestamps.json" with { type: "json" };
import {
  buildBadgeUrl,
  type BadgeFormat,
  type BadgeType,
  type StandaloneBadgeType,
  type Theme,
} from "../validation/badge";

function buildAlternateLanguages(href: Pathname): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = getPathname({ locale: loc, href });
  }
  languages["x-default"] = getPathname({ locale: LOCALES[0], href });
  return languages;
}

export function ogBadge(
  variant: BadgeType | StandaloneBadgeType,
  locale: string,
  opts: {
    theme?: Theme;
    format?: BadgeFormat;
    model?: string;
    models?: string[];
  } = {},
) {
  return buildBadgeUrl(variant, {
    locale,
    theme: opts.theme ?? "dark",
    format: opts.format ?? "png",
    size: "og",
    model: opts.model,
    models: opts.models,
    v: Number(dayjs.utc().format("YYYYMMDD")),
  });
}

type MetadataParams = {
  locale: Locale;
  href: Pathname;
  // Duplicate-content pages (e.g. a :free model twin) canonicalize to a different
  // URL; hreflang alternates follow it too, since hreflang must link canonicals.
  canonicalHref?: Pathname;
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
  robots?: boolean;
};

export function getPageMetadata(params: MetadataParams): Metadata {
  const canonicalTarget = params.canonicalHref ?? params.href;
  const canonicalPath = getPathname({
    locale: params.locale,
    href: canonicalTarget,
  });
  const shouldIndex = params.robots ?? true;
  const ogImageUrl = params.ogImage ?? ogBadge("hero", params.locale);

  return {
    metadataBase: new URL(env.appUrl),
    title: params.title,
    description: params.description,
    keywords: params.keywords.split(", "),
    icons: {
      icon: [
        { url: "/images/logo/logo.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
        {
          url: "/images/icons/icon-192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          url: "/images/icons/icon-512.png",
          sizes: "512x512",
          type: "image/png",
        },
      ],
      apple: { url: "/images/icons/apple-icon.png", sizes: "180x180" },
    },
    manifest: `/${params.locale}/manifest.webmanifest`,
    ...(env.googleSiteVerification && {
      verification: { google: env.googleSiteVerification },
    }),
    alternates: {
      canonical: canonicalPath,
      languages: buildAlternateLanguages(canonicalTarget),
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

type SeoTimestamp = {
  published: string;
  modified: string;
};

const seoTimestamps = rawTimestamps as Record<string, SeoTimestamp>;

export function getSeoTimestamps(
  slug: SeoTimestampSlug,
): SeoTimestamp | undefined {
  return seoTimestamps[slug];
}
