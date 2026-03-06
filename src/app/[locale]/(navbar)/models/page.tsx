import { Models } from "@/components/pages/models/models";
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
    title: t("MODELS.META.TITLE"),
    description: t("MODELS.META.DESCRIPTION"),
    keywords: t("MODELS.META.KEYWORDS"),
    path: `/${locale}/models`,
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
