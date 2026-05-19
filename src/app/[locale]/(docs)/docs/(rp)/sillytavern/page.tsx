import { SillyTavernContent } from "@/components/pages/docs/rp/sillytavern/sillytavern-content";
import { APP_VALUES } from "@/lib/config/constants";
import { DocPageSchema } from "@/lib/seo/json-ld";
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
    href: "/docs/sillytavern",
    title: t("DOCS.SILLYTAVERN.META.TITLE", APP_VALUES),
    description: t("DOCS.SILLYTAVERN.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.SILLYTAVERN.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("square", locale),
  });
}

export default async function SillyTavernPage() {
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug="docs/sillytavern"
        title={t("DOCS.SILLYTAVERN.META.TITLE", APP_VALUES)}
        description={t("DOCS.SILLYTAVERN.META.DESCRIPTION", APP_VALUES)}
      />
      <SillyTavernContent />
    </>
  );
}
