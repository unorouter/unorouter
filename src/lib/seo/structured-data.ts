import { env } from "@/lib/config/env";
import { dayjs } from "@/lib/utils/format/date";
import type {
  Article,
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  HowTo,
  Organization,
  Product,
  SoftwareApplication,
  WebSite,
  WithContext,
} from "schema-dts";

function abs(path: string): string {
  return `${env.siteOrigin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildOrganizationSchema(): WithContext<Organization> {
  const sameAs = [env.githubUrl, env.twitterUrl, env.discordUrl].filter(
    (v): v is string => Boolean(v),
  );

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: env.appName,
    url: env.siteOrigin,
    logo: abs("/images/logo/logo.png"),
    ...(sameAs.length && { sameAs }),
  };
}

export function buildWebSiteSchema(locale: string): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: env.appName,
    url: `${env.siteOrigin}/${locale}`,
    inLanguage: locale,
  };
}

type SoftwareApplicationInput = {
  locale: string;
  description: string;
  modelCount?: number;
  name?: string;
  url?: string;
  brandName?: string;
};

export function buildSoftwareApplicationSchema(
  input: SoftwareApplicationInput,
): WithContext<SoftwareApplication> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name ?? env.appName,
    url: input.url ? abs(input.url) : `${env.siteOrigin}/${input.locale}`,
    applicationCategory: "WebApplication",
    operatingSystem: "Web, Linux, macOS, Windows",
    description: input.description,
    ...(input.brandName && {
      brand: { "@type": "Brand", name: input.brandName },
    }),
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

type CollectionItem = {
  name: string;
  url: string;
  description?: string;
};

type CollectionPageInput = {
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

type ArticleInput = {
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

type ProductSchemaInput = {
  name: string;
  description: string;
  url: string;
  inputPrice?: number;
  outputPrice?: number;
  isFree: boolean;
};

export function buildProductSchema(
  input: ProductSchemaInput,
): WithContext<Product> {
  const offers = input.isFree
    ? [
        {
          "@type": "Offer" as const,
          price: 0,
          priceCurrency: "USD",
          description: "Free tier, shared pools with a light per model rate limit",
          availability: "https://schema.org/InStock",
        },
      ]
    : [
        ...(input.inputPrice != null
          ? [
              {
                "@type": "Offer" as const,
                price: input.inputPrice,
                priceCurrency: "USD",
                description: "USD per 1M input tokens, pay as you go",
                availability: "https://schema.org/InStock",
              },
            ]
          : []),
        ...(input.outputPrice != null
          ? [
              {
                "@type": "Offer" as const,
                price: input.outputPrice,
                priceCurrency: "USD",
                description: "USD per 1M output tokens, pay as you go",
                availability: "https://schema.org/InStock",
              },
            ]
          : []),
      ];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description,
    url: abs(input.url),
    brand: {
      "@type": "Organization",
      name: env.appName,
      url: env.siteOrigin,
    },
    ...(offers.length && { offers }),
  };
}

export type HowToStepInput = {
  name: string;
  text: string;
};

export function buildHowToSchema(
  name: string,
  description: string,
  url: string,
  steps: HowToStepInput[],
): WithContext<HowTo> {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url: abs(url),
    step: steps.map((step, i) => ({
      "@type": "HowToStep" as const,
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}
