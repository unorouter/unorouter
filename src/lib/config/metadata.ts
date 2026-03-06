import type { Metadata } from "next";
import { LANGUAGES, LOCALES } from "./constants";

type MetadataParams = {
  locale: string;
  title: string;
  description: string;
  keywords: string;
  path?: string;
  ogImage?: string;
  robots?: boolean;
};

export function getPageMetadata(params: MetadataParams): Metadata {
  const canonicalPath = params.path || `/${params.locale}`;
  const ogImageUrl = params.ogImage || "/logo.webp";
  const shouldIndex = params.robots ?? true;

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_URL || "https://unorouter.ai",
    ),
    title: params.title,
    description: params.description,
    keywords: params.keywords.split(", "),
    alternates: {
      canonical: canonicalPath,
      languages: Object.fromEntries([
        ...LOCALES.map((loc) => [
          loc,
          canonicalPath.replace(/^\/(en|de)/, `/${loc}`),
        ]),
        ["x-default", canonicalPath.replace(/^\/(en|de)/, `/${LOCALES[0]}`)],
      ]),
    },
    openGraph: {
      title: params.title,
      description: params.description,
      type: "website",
      locale: LANGUAGES.find(
        (l) => l.code === params.locale.toUpperCase(),
      )?.ogLocale,
      alternateLocale: LANGUAGES.map((l) => l.ogLocale),
      siteName: "UnoRouter",
      images: [
        {
          url: ogImageUrl,
          alt: params.title,
          width: 512,
          height: 512,
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
