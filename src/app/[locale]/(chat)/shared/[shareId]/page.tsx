import { Chat } from "@/components/pages/chat/chat";
import { SharedChatProvider } from "@/components/pages/chat/runtime/shared-chat-provider";
import { APP_VALUES, PAGE_SIZE } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { handleElysia } from "@/lib/utils/base";
import { resolveSharedConv, serverLocale } from "@/lib/utils/server";
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
  const resolved = await resolveSharedConv(shareId);
  return getPageMetadata({
    locale,
    href: { pathname: "/shared/[shareId]", params: { shareId } },
    title: resolved?.title
      ? t("CHAT.META.SHARED_TITLE_WITH_NAME", {
          ...APP_VALUES,
          title: resolved.title,
        })
      : t("CHAT.META.SHARED_TITLE", APP_VALUES),
    description: t("CHAT.META.SHARED_DESCRIPTION", APP_VALUES),
    keywords: t("CHAT.META.KEYWORDS"),
    robots: false,
    ogImage: ogBadge("pricing", locale),
  });
}

export default async function SharedPage(props: Props) {
  const { shareId } = await props.params;
  const resolved = await resolveSharedConv(shareId);
  if (!resolved) notFound();

  const { convId } = resolved;
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.chatMeta(convId),
      queryFn: async () =>
        handleElysia(await rpc.api.chat({ id: convId }).meta.get()),
    }),
    queryClient.prefetchInfiniteQuery({
      queryKey: queryKeys.chatMessages(convId),
      queryFn: async ({ pageParam }) =>
        handleElysia(
          await rpc.api.chat({ id: convId }).get({
            query: { p: pageParam, page_size: PAGE_SIZE },
          }),
        ),
      initialPageParam: 1,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SharedChatProvider convId={convId}>
        <Chat readOnly convId={convId} />
      </SharedChatProvider>
    </HydrationBoundary>
  );
}
