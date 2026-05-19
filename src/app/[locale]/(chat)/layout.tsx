import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { ChatRuntimeProvider } from "@/components/pages/sidebar/chat/runtime/chat-runtime-provider";
import { GuestConvsClaim } from "@/components/pages/sidebar/chat/runtime/guest-convs-claim";
import { GuestLocalDbMigrate } from "@/components/pages/sidebar/chat/runtime/guest-local-db-migrate";
import { ConversationList } from "@/components/pages/sidebar/chat/sidebar/conversation-list";
import { RpDialogs } from "@/components/pages/sidebar/chat/sidebar/sidebar-rp-nav";
import { SyncStateHydrator } from "@/lib/db/client/sync-state-hydrator";
import { PAGE_SIZE } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

export default async function ChatLayout(props: Props) {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () =>
      handleElysia(await rpc.api.auth.self.get(cookieHeaders!)),
  });

  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => handleElysia(await rpc.api.pricing.get()),
    }),
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
    isLoggedIn &&
      queryClient.prefetchQuery({
        queryKey: queryKeys.characters(),
        queryFn: async () =>
          handleElysia(await rpc.api.rp.characters.get(cookieHeaders!)),
      }),
    isLoggedIn &&
      queryClient.prefetchQuery({
        queryKey: queryKeys.personas(),
        queryFn: async () =>
          handleElysia(await rpc.api.rp.personas.get(cookieHeaders!)),
      }),
    isLoggedIn &&
      queryClient.prefetchQuery({
        queryKey: queryKeys.lorebooks(),
        queryFn: async () =>
          handleElysia(await rpc.api.rp.lorebooks.get(cookieHeaders!)),
      }),
    isLoggedIn &&
      queryClient.prefetchQuery({
        queryKey: queryKeys.presets(),
        queryFn: async () =>
          handleElysia(await rpc.api.rp.presets.get(cookieHeaders!)),
      }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatRuntimeProvider>
        <SyncStateHydrator />
        <GuestConvsClaim />
        <GuestLocalDbMigrate />
        <SidebarLayout
          navConfig="chat"
          chatContent={<ConversationList />}
        >
          {props.children}
        </SidebarLayout>
        <RpDialogs />
      </ChatRuntimeProvider>
    </HydrationBoundary>
  );
}
