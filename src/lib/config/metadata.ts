import type { Metadata } from "next";
import type {
  BadgeFormat,
  BadgeType,
  Theme,
} from "../validation/badge";
import { serverPathname } from "../utils/server";
import { ALTERNATE_LANGUAGES, LANGUAGES, LOCALES } from "./constants";
import { env } from "./env";

export function ogBadge(
  variant: BadgeType,
  locale: string,
  opts: { theme?: Theme; format?: BadgeFormat } = {},
) {
  const theme: Theme = opts.theme ?? "dark";
  const format: BadgeFormat = opts.format ?? "png";
  return `/api/badge/${variant}?format=${format}&theme=${theme}&locale=${locale}`;
}

type MetadataParams = {
  locale: string;
  title: string;
  description: string;
  keywords: string;
  ogImage?: string;
  robots?: boolean;
};

export async function getPageMetadata(
  params: MetadataParams,
): Promise<Metadata> {
  const canonicalPath = await serverPathname(params.locale);
  const shouldIndex = params.robots ?? true;
  const ogImageUrl = params.ogImage ?? ogBadge("hero", params.locale);

  return {
    metadataBase: new URL(env.appUrl),
    title: params.title,
    description: params.description,
    keywords: params.keywords.split(", "),
    alternates: {
      canonical: canonicalPath,
      languages: {
        ...ALTERNATE_LANGUAGES,
        "x-default": `/${LOCALES[0]}`,
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
