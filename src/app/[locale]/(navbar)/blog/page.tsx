import { Blog } from "@/components/pages/blog/blog";
import { getAllPostsSorted, translated } from "@/components/pages/blog/posts";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import {
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
} from "@/lib/seo/structured-data";
import { localeUrl } from "@/i18n/navigation";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/blog",
    title: t("BLOG.META_TITLE", APP_VALUES),
    description: t("BLOG.META_DESC", APP_VALUES),
    keywords: t("BLOG.META_KEYWORDS", APP_VALUES),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function BlogPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const posts = getAllPostsSorted();

  return (
    <>
      <JsonLd
        id="blog-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          { name: t("BLOG.TITLE"), url: localeUrl(locale, "/blog") },
        ])}
      />
      <JsonLd
        id="blog-collection"
        data={buildCollectionPageSchema({
          name: t("BLOG.TITLE"),
          description: t("BLOG.META_DESC", APP_VALUES),
          url: localeUrl(locale, "/blog"),
          items: posts.map((post) => {
            const tr = translated(t, post);
            return {
              name: tr.title,
              url: localeUrl(locale, {
                pathname: "/blog/[slug]",
                params: { slug: post.slug },
              }),
              description: tr.description,
            };
          }),
        })}
      />
      <Blog />
    </>
  );
}
