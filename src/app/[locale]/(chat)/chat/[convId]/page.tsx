import { Chat } from "@/components/pages/chat/chat";
import { APP_VALUES, PAGE_SIZE } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import {
  fetchConvTitle,
  getServerGuestConvIds,
  serverLocale,
  setCookies,
} from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; convId: string }>;
};

export async function generateMetadata(props: Props) {
  const { convId } = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const convTitle = await fetchConvTitle(convId);
  return getPageMetadata({
    locale,
    title: convTitle
      ? t("CHAT.META.TITLE_WITH_NAME", { ...APP_VALUES, title: convTitle })
      : t("CHAT.META.TITLE", APP_VALUES),
    description: t("CHAT.META.DESCRIPTION"),
    keywords: t("CHAT.META.KEYWORDS"),
    robots: false,
  });
}

export default async function ChatConvPage(props: Props) {
  const { convId, locale } = await props.params;
  const queryClient = getQueryClient();
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  if (!isLoggedIn) {
    const guestIds = await getServerGuestConvIds();
    if (!guestIds.includes(convId)) redirect(`/${locale}/chat`);
  }

  if (isLoggedIn) {
    const cookieHeaders = await setCookies();
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.chatMeta(convId),
        queryFn: async () =>
          handleElysia(
            await rpc.api.chat({ id: convId }).meta.get(cookieHeaders),
          ),
      }),
      queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.chatMessages(convId),
        queryFn: async ({ pageParam }) =>
          handleElysia(
            await rpc.api.chat({ id: convId }).get({
              query: { p: pageParam, page_size: PAGE_SIZE },
              ...cookieHeaders,
            }),
          ),
        initialPageParam: 1,
      }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Chat />
    </HydrationBoundary>
  );
}
