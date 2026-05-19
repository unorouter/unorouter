import { JanitorAIContent } from "@/components/pages/docs/rp/janitor-ai/janitor-ai-content";
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
    href: "/docs/janitor-ai",
    title: t("DOCS.JANITOR_AI.META.TITLE", APP_VALUES),
    description: t("DOCS.JANITOR_AI.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.JANITOR_AI.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("square", locale),
  });
}

export default async function JanitorAIPage() {
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug="docs/janitor-ai"
        title={t("DOCS.JANITOR_AI.META.TITLE", APP_VALUES)}
        description={t("DOCS.JANITOR_AI.META.DESCRIPTION", APP_VALUES)}
      />
      <JanitorAIContent />
    </>
  );
}
