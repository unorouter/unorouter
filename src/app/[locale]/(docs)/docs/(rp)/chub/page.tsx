import { ChubContent } from "@/components/pages/docs/rp/chub/chub-content";
import { APP_VALUES } from "@/lib/config/constants";
import { DocPageSchema } from "@/lib/seo/docs-schema";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/docs/chub",
    title: t("DOCS.CHUB.META.TITLE", APP_VALUES),
    description: t("DOCS.CHUB.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.CHUB.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("square", locale),
  });
}

export default async function ChubPage() {
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug="docs/chub"
        title={t("DOCS.CHUB.META.TITLE", APP_VALUES)}
        description={t("DOCS.CHUB.META.DESCRIPTION", APP_VALUES)}
      />
      <ChubContent />
    </>
  );
}
