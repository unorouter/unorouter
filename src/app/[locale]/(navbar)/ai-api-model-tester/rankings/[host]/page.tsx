import { ProviderDetail } from "@/components/pages/navbar/model-tester/rankings/provider-detail";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

// Hosts are user-submitted, so these detail pages stay out of the index; without
// their own metadata they inherited the home page title and canonical.
export async function generateMetadata(props: {
  params: Promise<{ locale: string; host: string }>;
}) {
  const params = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: {
      pathname: "/ai-api-model-tester/rankings/[host]",
      params: { host: params.host },
    },
    title: `${decodeURIComponent(params.host)} | ${t("MODEL_TESTER.RANKINGS.META_TITLE", APP_VALUES)}`,
    description: t("MODEL_TESTER.RANKINGS.META_DESCRIPTION", APP_VALUES),
    keywords: t("MODEL_TESTER.META.KEYWORDS"),
    robots: false,
  });
}

type Props = {
  params: Promise<{ locale: string; host: string }>;
};

export default async function ModelTesterProviderPage(props: Props) {
  const params = await props.params;
  const host = decodeURIComponent(params.host);
  const queryClient = getQueryClient();

  await prefetchElysia(
    queryClient,
    queryKeys.modelTesterProviderDetail(host),
    () => rpc.api.models["model-tester"].rankings({ host }).get(),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProviderDetail host={host} />
    </HydrationBoundary>
  );
}
