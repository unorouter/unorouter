import { TesterForm } from "@/components/pages/navbar/model-tester/tester-form";
import { APP_VALUES } from "@/lib/config/constants";
import { localeUrl } from "@/i18n/navigation";
import { JsonLd } from "@/lib/seo/json-ld";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/ai-api-model-tester",
    title: t("MODEL_TESTER.META.TITLE", APP_VALUES),
    description: t("MODEL_TESTER.META.DESCRIPTION", APP_VALUES),
    keywords: t("MODEL_TESTER.META.KEYWORDS"),
    ogImage: ogBadge("tester", locale),
  });
}

export default async function ModelTesterPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });

  return (
    <>
      <JsonLd
        id="model-tester-breadcrumb"
        data={buildBreadcrumbListSchema([
          { name: t("NAV.HOME"), url: localeUrl(locale, "/") },
          {
            name: t("NAV.MODEL_TESTER"),
            url: localeUrl(locale, "/ai-api-model-tester"),
          },
        ])}
      />
      <TesterForm />
    </>
  );
}
