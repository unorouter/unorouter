import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { ConversationList } from "@/components/pages/chat/sidebar/conversation-list";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { getIsLoggedIn } from "@/store/auth-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

export default async function ChatLayout(props: Props) {
  const queryClient = getQueryClient();
  const isLoggedIn = getIsLoggedIn();

  const cookieHeaders = isLoggedIn ? await setCookies() : undefined;

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => handleElysia(await rpc.api.pricing.get()),
    }),
    isLoggedIn &&
      queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.conversations(),
        queryFn: async ({ pageParam }) =>
          handleElysia(
            await rpc.api.chat.get({
              query: { p: pageParam, page_size: 20 },
              ...cookieHeaders!,
            }),
          ),
        initialPageParam: 1,
      }),
    isLoggedIn &&
      queryClient.prefetchQuery({
        queryKey: queryKeys.bestKey(),
        queryFn: async () =>
          handleElysia(
            await rpc.api.token["best-key"].get({
              ...cookieHeaders!,
            }),
          ),
      }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarLayout navConfig="chat" chatContent={<ConversationList />}>
        {props.children}
      </SidebarLayout>
    </HydrationBoundary>
  );
}
