import { GeminiCliContent } from "@/components/pages/docs/gemini-cli/gemini-cli-content";
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
    href: "/docs/gemini-cli",
    title: t("DOCS.GEMINI_CLI.META.TITLE", APP_VALUES),
    description: t("DOCS.GEMINI_CLI.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.GEMINI_CLI.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("square", locale),
  });
}

export default async function GeminiCliPage() {
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug="docs/gemini-cli"
        title={t("DOCS.GEMINI_CLI.META.TITLE", APP_VALUES)}
        description={t("DOCS.GEMINI_CLI.META.DESCRIPTION", APP_VALUES)}
      />
      <GeminiCliContent />
    </>
  );
}
