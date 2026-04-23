import { CodexContent } from "@/components/pages/docs/cli/codex/codex-content";
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
    href: "/docs/codex",
    title: t("DOCS.CODEX.META.TITLE", APP_VALUES),
    description: t("DOCS.CODEX.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.CODEX.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("banner", locale),
  });
}

export default async function CodexPage() {
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug="docs/codex"
        title={t("DOCS.CODEX.META.TITLE", APP_VALUES)}
        description={t("DOCS.CODEX.META.DESCRIPTION", APP_VALUES)}
      />
      <CodexContent />
    </>
  );
}
