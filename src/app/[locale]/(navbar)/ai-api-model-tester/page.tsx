import { TesterForm } from "@/components/pages/navbar/model-tester/run/tester-form";
import { localeUrl } from "@/i18n/navigation";
import { JsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { buildBreadcrumbListSchema } from "@/lib/seo/structured-data";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "MODEL_TESTER",
    href: "/ai-api-model-tester",
    badge: "tester",
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
