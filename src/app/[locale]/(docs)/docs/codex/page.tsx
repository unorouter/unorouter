import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata, ogBadge } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { CodexContent } from "@/components/pages/docs/codex/codex-content";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS.CODEX.META.TITLE", APP_VALUES),
    description: t("DOCS.CODEX.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.CODEX.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function CodexPage() {
  return <CodexContent />;
}
