import { ClaudeCodeContent } from "@/components/pages/docs/cli/claude-code/claude-code-content";
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
    href: "/docs/claude-code",
    title: t("DOCS.CLAUDE_CODE.META.TITLE", APP_VALUES),
    description: t("DOCS.CLAUDE_CODE.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.CLAUDE_CODE.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function ClaudeCodePage() {
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug="docs/claude-code"
        title={t("DOCS.CLAUDE_CODE.META.TITLE", APP_VALUES)}
        description={t("DOCS.CLAUDE_CODE.META.DESCRIPTION", APP_VALUES)}
      />
      <ClaudeCodeContent />
    </>
  );
}
