import { prefetchElysia } from "@/lib/react-query/prefetch";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { RpDialogs } from "@/components/pages/sidebar/chat/rp/rp-dialogs";
import { ChatRuntimeProvider } from "@/components/pages/sidebar/chat/runtime/chat-runtime-provider";
import { ConversationList } from "@/components/pages/sidebar/chat/sidebar/conversation-list";
import { SyncStateHydrator } from "@/lib/db/client/sync/sync-state-hydrator";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

export default async function ChatLayout(props: Props) {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await prefetchElysia(queryClient, queryKeys.auth(), () =>
    rpc.api.auth.account.self.get(cookieHeaders!),
  );

  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.pricing(), () =>
      rpc.api.models.pricing.get(),
    ),
    isLoggedIn &&
      prefetchElysia(queryClient, queryKeys.bestKey(), () =>
        rpc.api.billing.token["best-key"].get({
          ...cookieHeaders!,
        }),
      ),
    isLoggedIn &&
      prefetchElysia(queryClient, queryKeys.syncState(), () =>
        rpc.api.ai.sync.state.get(cookieHeaders!),
      ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatRuntimeProvider>
        <SyncStateHydrator />
        <SidebarLayout navConfig="chat" chatContent={<ConversationList />}>
          {props.children}
        </SidebarLayout>
        <RpDialogs />
      </ChatRuntimeProvider>
    </HydrationBoundary>
  );
}
