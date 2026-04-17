import { Blog } from "@/components/pages/blog/blog";
import { APP_VALUES } from "@/lib/config/constants";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
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

  return (
    <>
      <JsonLd
        id="blog-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: `/${locale}` },
          { name: t("BLOG.TITLE"), url: `/${locale}/blog` },
        ])}
      />
      <Blog />
    </>
  );
}
