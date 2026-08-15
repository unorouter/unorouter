import { ImagePage } from "@/components/pages/sidebar/image/image-page";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/image",
    title: t("IMAGE.META_TITLE", APP_VALUES),
    description: t("IMAGE.META_DESC", APP_VALUES),
    keywords: t("METADATA.ACCOUNT.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("hero", locale),
  });
}

export default async function ImageRootPage() {
  const queryClient = getQueryClient();
  await prefetchElysia(queryClient, queryKeys.pricingImageModels(), () =>
    rpc.api.models.pricing["image-models"].get(),
  );
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ImagePage />
    </HydrationBoundary>
  );
}
