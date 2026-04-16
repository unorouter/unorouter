import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata, ogBadge } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { OpenClawContent } from "@/components/pages/docs/openclaw-content";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS.OPENCLAW.META.TITLE", APP_VALUES),
    description: t("DOCS.OPENCLAW.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.OPENCLAW.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("square", locale),
  });
}

export default async function OpenClawPage() {
  return <OpenClawContent />;
}
