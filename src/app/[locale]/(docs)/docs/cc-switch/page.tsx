import { CCSwitchContent } from "@/components/pages/docs/cc-switch/cc-switch-content";
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
    title: t("DOCS.CC_SWITCH.META.TITLE", APP_VALUES),
    description: t("DOCS.CC_SWITCH.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.CC_SWITCH.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("square", locale),
  });
}

export default async function CCSwitchPage() {
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug="docs/cc-switch"
        title={t("DOCS.CC_SWITCH.META.TITLE", APP_VALUES)}
        description={t("DOCS.CC_SWITCH.META.DESCRIPTION", APP_VALUES)}
      />
      <CCSwitchContent />
    </>
  );
}
