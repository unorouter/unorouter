import { Pricing } from "@/components/pages/pricing/pricing";
import { getPageMetadata } from "@/lib/config/metadata";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale: locale as Locale });
  return getPageMetadata({
    locale,
    title: t("PRICING.META.TITLE"),
    description: t("PRICING.META.DESCRIPTION"),
    keywords: t("PRICING.META.KEYWORDS"),
    path: `/${locale}/pricing`,
  });
}

export default async function PricingPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.subscriptionPlans(),
    queryFn: async () => handleElysia(await rpc.api.subscription.plans.get()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Pricing />
    </HydrationBoundary>
  );
}
