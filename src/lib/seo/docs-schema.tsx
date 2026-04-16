import { pathnames } from "@/i18n/routing";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
  type BreadcrumbItem,
} from "@/lib/seo/structured-data";
import { getLocale, getTranslations } from "next-intl/server";
import { getSeoTimestamps } from "./timestamps";

type DocSlug = keyof typeof pathnames extends infer K
  ? K extends `/${infer R extends `docs/${string}`}`
    ? R
    : never
  : never;

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
    { name: t("NAV.DOCS"), url: `/${locale}/docs` },
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
          locale,
          headline: props.title,
          description: props.description,
          url: `/${locale}/${props.slug}`,
          image: props.image,
          datePublished: ts?.published,
          dateModified: ts?.modified,
        })}
      />
    </>
  );
}
