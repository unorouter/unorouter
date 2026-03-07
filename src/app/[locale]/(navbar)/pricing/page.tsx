import { Pricing } from "@/components/pages/pricing/pricing";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("PRICING.META.TITLE", APP_VALUES),
    description: t("PRICING.META.DESCRIPTION"),
    keywords: t("PRICING.META.KEYWORDS"),
  });
}

export default async function PricingPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: async () => handleElysia(await rpc.api.pricing.subscriptions.get()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Pricing />
    </HydrationBoundary>
  );
}
