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

  // Pricing is intentionally NOT prefetched here: dehydrating 700+ full model
  // objects put ~2.3MB of RSC flight payload in the chat HTML (182KB brotli),
  // dominating LCP on slow connections. The model selector fetches it
  // client-side right after mount instead.
  if (isLoggedIn) {
    await prefetchElysia(queryClient, queryKeys.bestKey(), (cookies) =>
      rpc.api.billing.token["best-key"].get({
        ...cookies,
      }),
    );
  }

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
