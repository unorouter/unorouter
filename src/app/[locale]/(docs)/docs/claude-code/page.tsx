import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata, ogBadge } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { ClaudeCodeContent } from "@/components/pages/docs/claude-code-content";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("DOCS.CLAUDE_CODE.META.TITLE", APP_VALUES),
    description: t("DOCS.CLAUDE_CODE.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.CLAUDE_CODE.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function ClaudeCodePage() {
  return <ClaudeCodeContent />;
}
