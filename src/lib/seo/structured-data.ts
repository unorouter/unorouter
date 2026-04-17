import { env } from "@/lib/config/env";
import type {
  Article,
  BreadcrumbList,
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
  const sameAs: string[] = [];
  if (env.githubUrl) sameAs.push(env.githubUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: env.appName || "unorouter",
    url: siteOrigin,
    logo: abs("/logo.png"),
    ...(sameAs.length && { sameAs }),
  };
}

export function buildWebSiteSchema(locale: string): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: env.appName || "unorouter",
    url: `${siteOrigin}/${locale}`,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteOrigin}/${locale}/docs?q={search_term_string}`,
      },
      ...({ "query-input": "required name=search_term_string" } as Record<
        string,
        string
      >),
    },
  };
}

type SoftwareApplicationInput = {
  locale: string;
  description: string;
  modelCount?: number;
};

export function buildSoftwareApplicationSchema(
  input: SoftwareApplicationInput,
): WithContext<SoftwareApplication> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: env.appName || "unorouter",
    url: `${siteOrigin}/${input.locale}`,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web, Linux, macOS, Windows",
    description: input.description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Pay-as-you-go per-token pricing. No subscription.",
    },
    ...(env.githubUrl && { sameAs: [env.githubUrl] }),
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

export function buildFAQPageSchema(
  entries: FAQEntry[],
): WithContext<FAQPage> {
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

export type ArticleInput = {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
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
      datePublished: new Date(input.datePublished).toISOString(),
    }),
    ...(input.dateModified && {
      dateModified: new Date(input.dateModified).toISOString(),
    }),
    ...(input.author && {
      author: { "@type": "Person", name: input.author },
    }),
    publisher: buildOrganizationSchema(),
  };
}
