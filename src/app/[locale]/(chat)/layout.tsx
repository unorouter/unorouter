import { serverLocale } from "@/lib/utils/server";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { RpDialogs } from "@/components/pages/sidebar/chat/rp/rp-dialogs";
import { ChatRuntimeProvider } from "@/components/pages/sidebar/chat/runtime/chat-runtime-provider";
import { ViewportDebugLogger } from "@/components/pages/sidebar/chat/viewport-debug-logger";
import { ConversationList } from "@/components/pages/sidebar/chat/sidebar/conversation-list";
import { AuthHydration } from "@/components/provider/state/auth-hydration";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Nothing upstream is prefetched into this layout: every server await here
// delays first paint of the chat shell. Pricing (700+ model objects, ~2.3MB
// flight) and model-status (the selector's reliability dots) both fetch
// client-side right after mount via their React Query hooks instead.
export default async function ChatLayout(props: Props) {
  await serverLocale(props);
  return (
    <AuthHydration withBestKey>
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
    </AuthHydration>
  );
}
