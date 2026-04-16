import { Models } from "@/components/pages/navbar/models/models";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { handleElysia } from "@/lib/utils/base";
import { serverLocale } from "@/lib/utils/server";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("MODELS.META.TITLE", APP_VALUES),
    description: t("MODELS.META.DESCRIPTION"),
    keywords: t("MODELS.META.KEYWORDS"),
    ogImage: ogBadge("sponsor", locale),
  });
}

export default async function ModelsPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.pricing(),
    queryFn: async () => handleElysia(await rpc.api.pricing.get()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Models />
    </HydrationBoundary>
  );
}
