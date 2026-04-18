import { env } from "@/lib/config/env";
import dayjs from "dayjs";
import type {
  Article,
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  Organization,
  Product,
  SoftwareApplication,
  WebSite,
  WithContext,
} from "schema-dts";

const siteOrigin = new URL(env.appUrl).origin;

function abs(path: string): string {
  return `${siteOrigin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildOrganizationSchema(): WithContext<Organization> {
  const sameAs = [env.githubUrl, env.twitterUrl, env.discordUrl].filter(
    (v): v is string => Boolean(v),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: env.appName,
    url: siteOrigin,
    logo: abs("/logo.png"),
    ...(sameAs.length && { sameAs }),
  };
}

export function buildWebSiteSchema(locale: string): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: env.appName,
    url: `${siteOrigin}/${locale}`,
    inLanguage: locale,
  };
}

export type OfferInput = {
  name: string;
  price: number;
  currency: string;
  description?: string;
};

type SoftwareApplicationInput = {
  locale: string;
  description: string;
  modelCount?: number;
  offers?: OfferInput[];
};

function offerSchema(input: OfferInput) {
  return {
    "@type": "Offer" as const,
    name: input.name,
    price: String(input.price),
    priceCurrency: input.currency,
    ...(input.description && { description: input.description }),
  };
}

export function buildSoftwareApplicationSchema(
  input: SoftwareApplicationInput,
): WithContext<SoftwareApplication> {
  const defaultOffer = {
    "@type": "Offer" as const,
    price: "0",
    priceCurrency: "USD",
    description: "Pay-as-you-go per-token pricing. No subscription.",
  };
  const offers =
    input.offers && input.offers.length > 0
      ? [defaultOffer, ...input.offers.map(offerSchema)]
      : defaultOffer;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: env.appName,
    url: `${siteOrigin}/${input.locale}`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web, Linux, macOS, Windows",
    description: input.description,
    offers,
    ...(() => {
      const sameAs = [env.githubUrl, env.twitterUrl, env.discordUrl].filter(
        (v): v is string => Boolean(v),
      );
      return sameAs.length > 0 ? { sameAs } : {};
    })(),
  };
}

export type BreadcrumbItem = {
  name: string;
  url?: string;
};

export function buildBreadcrumbListSchema(
  items: BreadcrumbItem[],
): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: item.name,
      ...(item.url && { item: abs(item.url) }),
    })),
  };
}

export type FAQEntry = {
  question: string;
  answer: string;
};

export function buildFAQPageSchema(entries: FAQEntry[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((e) => ({
      "@type": "Question" as const,
      name: e.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: e.answer,
      },
    })),
  };
}

export type ProductInput = {
  name: string;
  description: string;
  url: string;
  brandName: string;
  price?: number;
  priceCurrency?: string;
  priceUnit?: string;
  image?: string;
};

export function buildProductSchema(input: ProductInput): WithContext<Product> {
  const schema: WithContext<Product> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: abs(input.url),
    brand: {
      "@type": "Brand",
      name: input.brandName,
    },
  };

  if (input.image) {
    schema.image = abs(input.image);
  }

  if (input.price !== undefined) {
    schema.offers = {
      "@type": "Offer",
      price: String(input.price),
      priceCurrency: input.priceCurrency ?? "USD",
      url: abs(input.url),
      availability: "https://schema.org/InStock",
      ...(input.priceUnit && {
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: String(input.price),
          priceCurrency: input.priceCurrency ?? "USD",
          unitText: input.priceUnit,
        },
      }),
    };
  }

  return schema;
}

export type CollectionItem = {
  name: string;
  url: string;
  description?: string;
};

export type CollectionPageInput = {
  name: string;
  description: string;
  url: string;
  items: CollectionItem[];
};

export function buildCollectionPageSchema(
  input: CollectionPageInput,
): WithContext<CollectionPage> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: abs(input.url),
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: input.items.length,
      itemListElement: input.items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: abs(item.url),
        ...(item.description && { description: item.description }),
      })),
    },
  };
}

export type ArticleInput = {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string | { name: string; type: "Person" | "Organization" };
  locale: string;
};

export function buildArticleSchema(input: ArticleInput): WithContext<Article> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: abs(input.url),
    mainEntityOfPage: abs(input.url),
    inLanguage: input.locale,
    ...(input.image && { image: abs(input.image) }),
    ...(input.datePublished && {
      datePublished: dayjs(input.datePublished).toISOString(),
    }),
    ...(input.dateModified && {
      dateModified: dayjs(input.dateModified).toISOString(),
    }),
    ...(input.author && {
      author:
        typeof input.author === "string"
          ? { "@type": "Person", name: input.author }
          : { "@type": input.author.type, name: input.author.name },
    }),
    publisher: buildOrganizationSchema(),
  };
}
