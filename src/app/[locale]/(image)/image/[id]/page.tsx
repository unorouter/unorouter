import { ImagePage } from "@/components/pages/sidebar/image/image-page";
import { APP_VALUES } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { getPageMetadata } from "@/lib/seo/metadata";
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
    robots: false,
  });
}

// The client reads session/snapshot from the URL itself (useImageNav); the route only
// needs to exist for the path segment.
export default async function ImageSessionPage() {
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
