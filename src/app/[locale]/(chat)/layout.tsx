import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { ConversationList } from "@/components/pages/chat/sidebar/conversation-list";
import { ChatRuntimeProvider } from "@/components/pages/chat/utils/chat-runtime-provider";
import { PAGE_SIZE } from "@/lib/config/constants";
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
        queryKey: queryKeys.conversations(undefined),
        queryFn: async ({ pageParam }) =>
          handleElysia(
            await rpc.api.chat.conversations.get({
              query: { p: pageParam, page_size: PAGE_SIZE, keyword: undefined },
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
      <ChatRuntimeProvider>
        <SidebarLayout navConfig="chat" chatContent={<ConversationList />}>
          {props.children}
        </SidebarLayout>
      </ChatRuntimeProvider>
    </HydrationBoundary>
  );
}
