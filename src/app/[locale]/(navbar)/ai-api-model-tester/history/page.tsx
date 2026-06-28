import { HistoryTable } from "@/components/pages/navbar/model-tester/history-table";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/ai-api-model-tester/history",
    title: t("MODEL_TESTER.HISTORY.META_TITLE", APP_VALUES),
    description: t("MODEL_TESTER.META.DESCRIPTION", APP_VALUES),
    keywords: t("MODEL_TESTER.META.KEYWORDS"),
    robots: false,
  });
}

export default function ModelTesterHistoryPage() {
  return <HistoryTable />;
}
