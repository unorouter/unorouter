import { env } from "@/lib/config/env";
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
  type BreadcrumbItem,
} from "@/lib/seo/structured-data";
import type { DocSlug } from "@/lib/types";
import { getLocale, getTranslations } from "next-intl/server";
import type { Thing, WithContext } from "schema-dts";
import { getSeoTimestamps } from "./metadata";

interface JsonLdProps {
  data: WithContext<Thing> | WithContext<Thing>[];
  id?: string;
}

export function JsonLd(props: JsonLdProps) {
  return (
    <script
      key={props.id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(props.data) }}
      suppressHydrationWarning
    />
  );
}

interface DocPageSchemaProps {
  slug: DocSlug;
  title: string;
  description: string;
  image?: string;
}

export async function DocPageSchema(props: DocPageSchemaProps) {
  const locale = await getLocale();
  const t = await getTranslations();
  const ts = getSeoTimestamps(props.slug);

  const breadcrumb: BreadcrumbItem[] = [
    { name: t("NAV.HOME"), url: `/${locale}` },
    // The section index (/docs/platform, /docs/chat, /docs/integrations);
    // bare /docs is a redirect.
    {
      name: t("NAV.DOCS"),
      url: `/${locale}/${props.slug.split("/").slice(0, 2).join("/")}`,
    },
    { name: props.title, url: `/${locale}/${props.slug}` },
  ];

  return (
    <>
      <JsonLd
        id={`${props.slug}-breadcrumb`}
        data={buildBreadcrumbListSchema(breadcrumb)}
      />
      <JsonLd
        id={`${props.slug}-article`}
        data={buildArticleSchema({
          kind: "TechArticle",
          locale,
          headline: props.title,
          description: props.description,
          url: `/${locale}/${props.slug}`,
          image: props.image,
          datePublished: ts?.published,
          dateModified: ts?.modified,
          author: {
            type: "Organization",
            name: env.appName,
          },
        })}
      />
    </>
  );
}
