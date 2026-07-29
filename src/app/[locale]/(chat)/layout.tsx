import { serverLocale } from "@/lib/utils/server";
import { ChatShellSkeleton } from "@/components/pages/sidebar/chat/chat-shell-skeleton";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { RpDialogs } from "@/components/pages/sidebar/chat/rp/rp-dialogs";
import { ChatRuntimeProvider } from "@/components/pages/sidebar/chat/runtime/chat-runtime-provider";
import { ViewportDebugLogger } from "@/components/pages/sidebar/chat/viewport-debug-logger";
import { ConversationList } from "@/components/pages/sidebar/chat/sidebar/conversation-list";
import { AuthHydration } from "@/components/provider/state/auth-hydration";
import { Suspense } from "react";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Nothing upstream is prefetched into this layout: every server await here sits
// in the single Suspense hole ahead of the chat shell, so each one delays first
// paint. Pricing (700+ model objects, ~2.3MB flight) and model-status (the
// selector's reliability dots) both fetch client-side right after mount via
// their React Query hooks instead, so the chat UI streams without waiting.
export default async function ChatLayout(props: Props) {
  await serverLocale(props);
  return (
    <>
      {/* assistant-ui's thread-list runtime reads Math.random at init, which
          prerenders reject in client components; the boundary streams the
          whole chat UI per request instead. */}
      <Suspense fallback={<ChatShellSkeleton />}>
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
      </Suspense>
    </>
  );
}
