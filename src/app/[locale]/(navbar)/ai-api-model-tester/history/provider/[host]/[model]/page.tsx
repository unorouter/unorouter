import { HistoryModelTests } from "@/components/pages/navbar/model-tester/history/history-model-tests";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

// Hosts are user-submitted, so these detail pages stay out of the index; without
// their own metadata they inherited the home page title and canonical.
export async function generateMetadata(props: {
  params: Promise<{ locale: string; host: string; model: string }>;
}) {
  const params = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: {
      pathname: "/ai-api-model-tester/history/provider/[host]/[model]",
      params: { host: params.host, model: params.model },
    },
    title: `${decodeURIComponent(params.model)} @ ${decodeURIComponent(params.host)} | ${t("MODEL_TESTER.HISTORY.META_TITLE", APP_VALUES)}`,
    description: t("MODEL_TESTER.META.DESCRIPTION", APP_VALUES),
    keywords: t("MODEL_TESTER.META.KEYWORDS"),
    robots: false,
  });
}

type Props = {
  params: Promise<{ locale: string; host: string; model: string }>;
};

export default async function HistoryModelPage(props: Props) {
  const params = await props.params;
  return (
    <HistoryModelTests
      host={decodeURIComponent(params.host)}
      model={decodeURIComponent(params.model)}
    />
  );
}
