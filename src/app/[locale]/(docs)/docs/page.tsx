import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata, ogBadge } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { DocsIndexContent } from "@/components/pages/docs/docs-index-content";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS_INDEX.META.TITLE", APP_VALUES),
    description: t("DOCS_INDEX.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS_INDEX.META.KEYWORDS"),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function DocsPage() {
  return <DocsIndexContent />;
}
