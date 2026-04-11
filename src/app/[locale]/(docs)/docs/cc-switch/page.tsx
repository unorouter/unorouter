import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { CCSwitchContent } from "@/components/pages/docs/cc-switch-content";

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
    ogImage: `/api/badge/square?format=png&theme=dark&locale=${locale}`,
  });
}

export default async function CCSwitchPage() {
  return <CCSwitchContent />;
}
