import { getPathname } from "@/i18n/navigation";
import { type Pathname, routing } from "@/i18n/routing";
import {
  BLOG_REGISTRY,
  DOCS_REGISTRY,
  LEGAL_REGISTRY,
  type SeoTimestampSlug,
} from "@/i18n/registry";
import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { APP_VALUES, LANGUAGES, LOCALES } from "../config/constants";
import { serverLocale } from "../utils/server";
import { getTranslations } from "next-intl/server";
import { env } from "../config/env";
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
    v: Number(process.env.NEXT_PUBLIC_BUILD_DATE?.replaceAll("-", "")) || 1,
  });
}

type MetadataParams = {
  locale: Locale;
  href: Pathname;
  canonicalHref?: Pathname;
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
  robots?: boolean;
};

export async function pageMetadata(opts: {
  props: { params: Promise<{ locale: string }> };
  namespace: string;
  href: Pathname;
  badge?: Parameters<typeof ogBadge>[0];
  canonicalHref?: Pathname;
  robots?: boolean;
}): Promise<Metadata> {
  const locale = await serverLocale(opts.props);
  const t = await getTranslations({ locale });
  const key = (leaf: string) =>
    `${opts.namespace}.META.${leaf}` as Parameters<typeof t>[0];
  return getPageMetadata({
    locale,
    href: opts.href,
    canonicalHref: opts.canonicalHref,
    robots: opts.robots,
    title: t(key("TITLE"), APP_VALUES),
    description: t(key("DESCRIPTION"), APP_VALUES),
    keywords: t(key("KEYWORDS"), APP_VALUES),
    ogImage: opts.badge ? ogBadge(opts.badge, locale) : undefined,
  });
}

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
      locale: LANGUAGES.find((l) => l.locale === params.locale)?.ogLocale,
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

// Head for a route resolving to notFound(). The head streams before the body,
// so the 200 is already committed and cannot be changed. An empty metadata
// object would inherit the parent's "index, follow" plus a locale-root
// canonical, which Google reports as a soft 404.
export function notFoundMetadata(): Metadata {
  return {
    title: "Not Found",
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false },
    },
    alternates: { canonical: null },
  };
}

type SeoTimestamp = {
  published: string;
  modified: string;
};

const seoTimestamps: Record<string, SeoTimestamp> = Object.fromEntries(
  [
    ...DOCS_REGISTRY.map((d) => [d.slug, d] as const),
    ...BLOG_REGISTRY.map((b) => [`blog/${b.slug}`, b] as const),
    ...LEGAL_REGISTRY.map((l) => [l.slug, l] as const),
  ].map(([slug, entry]) => [
    slug,
    {
      published: entry.date,
      modified: ("updated" in entry ? entry.updated : undefined) ?? entry.date,
    },
  ]),
);

export function getSeoTimestamps(
  slug: SeoTimestampSlug,
): SeoTimestamp | undefined {
  return seoTimestamps[slug];
}
