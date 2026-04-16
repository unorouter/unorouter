import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata, ogBadge } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { GeminiCliContent } from "@/components/pages/docs/gemini-cli-content";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS.GEMINI_CLI.META.TITLE", APP_VALUES),
    description: t("DOCS.GEMINI_CLI.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.GEMINI_CLI.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("square", locale),
  });
}

export default async function GeminiCliPage() {
  return <GeminiCliContent />;
}
