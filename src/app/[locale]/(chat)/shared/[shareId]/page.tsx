import { SharedConversationView } from "@/components/pages/chat/shared-conversation-view";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { fetchSharedConvTitle, serverLocale } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; shareId: string }>;
};

export async function generateMetadata(props: Props) {
  const { shareId } = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const convTitle = await fetchSharedConvTitle(shareId);
  return getPageMetadata({
    locale,
    title: convTitle
      ? t("CHAT.META.SHARED_TITLE_WITH_NAME", { ...APP_VALUES, title: convTitle })
      : t("CHAT.META.SHARED_TITLE", APP_VALUES),
    description: t("CHAT.META.SHARED_DESCRIPTION", APP_VALUES),
    keywords: t("CHAT.META.KEYWORDS"),
    robots: false,
  });
}

export default async function SharedPage(props: Props) {
  const { shareId } = await props.params;
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.sharedConversation(shareId),
      queryFn: async () =>
        handleElysia(await rpc.api.chat.shared({ shareId }).get()),
    });
  } catch {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SharedConversationView shareId={shareId} />
    </HydrationBoundary>
  );
}
