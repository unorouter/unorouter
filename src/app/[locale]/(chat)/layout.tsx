import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { RpDialogs } from "@/components/pages/sidebar/chat/rp/rp-dialogs";
import { ChatRuntimeProvider } from "@/components/pages/sidebar/chat/runtime/chat-runtime-provider";
import { ViewportDebugLogger } from "@/components/pages/sidebar/chat/viewport-debug-logger";
import { ConversationList } from "@/components/pages/sidebar/chat/sidebar/conversation-list";
import { AuthHydration } from "@/components/provider/state/auth-hydration";
import { ChatStoreProvider } from "@/components/provider/state/chat-store-provider";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { getCookieValue } from "@/lib/utils/server";
import { CHAT_STORE_KEY, type ChatState } from "@/store/chat-store";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Prefetched into the request-scoped client that AuthHydration dehydrates
// below, so the chat shell renders with no post-mount round-trip. Only
// affordable because pricing arrives as curated slices; the full ~490KB
// pricing list stays out of here.
export default async function ChatLayout(props: Props) {
  const queryClient = getQueryClient();
  const [chatStoreCookie] = await Promise.all([
    getCookieValue<ChatState>(CHAT_STORE_KEY),
    prefetchElysia(queryClient, queryKeys.pricingCatalog(), () =>
      rpc.api.models.pricing.catalog.get(),
    ),
    prefetchElysia(queryClient, queryKeys.modelStatusComponents(), () =>
      rpc.api.models["model-status"].components.get(),
    ),
  ]);

  return (
    <AuthHydration withBestKey>
      <ChatStoreProvider data={chatStoreCookie}>
        <ChatRuntimeProvider>
          <ViewportDebugLogger />
          <SidebarLayout
            before={<AuthRedirectCleanup />}
            navConfig="chat"
            chatContent={<ConversationList />}
          >
            {props.children}
          </SidebarLayout>
          <RpDialogs />
        </ChatRuntimeProvider>
      </ChatStoreProvider>
    </AuthHydration>
  );
}
