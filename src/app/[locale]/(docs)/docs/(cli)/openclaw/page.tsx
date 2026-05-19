import { OpenClawContent } from "@/components/pages/docs/cli/openclaw/openclaw-content";
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
    href: "/docs/openclaw",
    title: t("DOCS.OPENCLAW.META.TITLE", APP_VALUES),
    description: t("DOCS.OPENCLAW.META.DESCRIPTION", APP_VALUES),
    keywords: t("DOCS.OPENCLAW.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("square", locale),
  });
}

export default async function OpenClawPage() {
  const t = await getTranslations();
  return (
    <>
      <DocPageSchema
        slug="docs/openclaw"
        title={t("DOCS.OPENCLAW.META.TITLE", APP_VALUES)}
        description={t("DOCS.OPENCLAW.META.DESCRIPTION", APP_VALUES)}
      />
      <OpenClawContent />
    </>
  );
}
