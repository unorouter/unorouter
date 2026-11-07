import { env } from "@/lib/config/env";
import { dayjs } from "@/lib/utils/format/date";
import type {
  Article,
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  HowTo,
  Offer,
  Organization,
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
  // schema-dts does not model Google's "query-input" shorthand.
  const searchAction = {
    "@type": "SearchAction" as const,
    target: {
      "@type": "EntryPoint" as const,
      urlTemplate: `${env.siteOrigin}/${locale}/models?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  };
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: env.appName,
    url: `${env.siteOrigin}/${locale}`,
    inLanguage: locale,
    potentialAction: searchAction,
  };
}

type SoftwareApplicationInput = {
  locale: string;
  description: string;
};

// The platform itself. Google requires offers or a rating; the free tier is a
// real zero-price offer.
export function buildSoftwareApplicationSchema(
  input: SoftwareApplicationInput,
): WithContext<SoftwareApplication> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: env.appName,
    url: `${env.siteOrigin}/${input.locale}`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web, Linux, macOS, Windows",
    description: input.description,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    publisher: buildOrganizationSchema(),
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
  ranked?: boolean;
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
      ...(input.ranked && {
        itemListOrder: "https://schema.org/ItemListOrderDescending",
      }),
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

function authorEntity(name: string): Organization {
  const sameAs = [env.githubUrl, env.twitterUrl, env.discordUrl].filter(
    (v): v is string => Boolean(v),
  );
  return {
    "@type": "Organization",
    name,
    url: env.siteOrigin,
    ...(sameAs.length && { sameAs }),
  };
}

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
          ? // "{appName} team" is us; any other byline is a person.
            input.author.includes(env.appName)
            ? authorEntity(input.author)
            : { "@type": "Person", name: input.author }
          : input.author.type === "Organization"
            ? authorEntity(input.author.name)
            : { "@type": "Person", name: input.author.name },
    }),
    publisher: buildOrganizationSchema(),
  };
}

type ModelSchemaInput = {
  name: string;
  description: string;
  url: string;
  image: string;
  vendorName: string;
  inputPrice?: number;
  outputPrice?: number;
  isFree: boolean;
};

function perMillionTokens(price: number, name: string): Offer {
  return {
    "@type": "Offer",
    name,
    price,
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    seller: { "@type": "Organization", name: env.appName },
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price,
      priceCurrency: "USD",
      referenceQuantity: {
        "@type": "QuantitativeValue",
        value: 1000000,
        unitText: "tokens",
      },
    },
  };
}

// A model is software made by its vendor and sold through us per million tokens.
// Product markup made Google validate model pages as merchant listings
// (shipping, returns), which an API can never satisfy.
export function buildModelSchema(
  input: ModelSchemaInput,
): WithContext<SoftwareApplication> {
  const offers: Offer[] = input.isFree
    ? [perMillionTokens(0, "Free tier")]
    : [
        ...(input.inputPrice != null
          ? [perMillionTokens(input.inputPrice, "Input tokens")]
          : []),
        ...(input.outputPrice != null
          ? [perMillionTokens(input.outputPrice, "Output tokens")]
          : []),
      ];

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    description: input.description,
    url: abs(input.url),
    image: abs(input.image),
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any (HTTP API)",
    author: { "@type": "Organization", name: input.vendorName },
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
