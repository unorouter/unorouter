import { prefetchElysia } from "@/lib/react-query/prefetch";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { RpDialogs } from "@/components/pages/sidebar/chat/rp/rp-dialogs";
import { ChatRuntimeProvider } from "@/components/pages/sidebar/chat/runtime/chat-runtime-provider";
import { CrossOriginIsolationGuard } from "@/components/provider/app/cross-origin-isolation-guard";
import { ConversationList } from "@/components/pages/sidebar/chat/sidebar/conversation-list";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

export default async function ChatLayout(props: Props) {
  const queryClient = getQueryClient();

  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );

  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.pricing(), () =>
      rpc.api.models.pricing.get(),
    ),
    isLoggedIn &&
      prefetchElysia(queryClient, queryKeys.bestKey(), (cookies) =>
        rpc.api.billing.token["best-key"].get({
          ...cookies,
        }),
      ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CrossOriginIsolationGuard>
        <ChatRuntimeProvider>
          <SidebarLayout navConfig="chat" chatContent={<ConversationList />}>
            {props.children}
          </SidebarLayout>
          <RpDialogs />
        </ChatRuntimeProvider>
      </CrossOriginIsolationGuard>
    </HydrationBoundary>
  );
}
