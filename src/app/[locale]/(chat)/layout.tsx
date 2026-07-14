import { serverLocale } from "@/lib/utils/server";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { RpDialogs } from "@/components/pages/sidebar/chat/rp/rp-dialogs";
import { ChatRuntimeProvider } from "@/components/pages/sidebar/chat/runtime/chat-runtime-provider";
import { ViewportDebugLogger } from "@/components/pages/sidebar/chat/viewport-debug-logger";
import { CrossOriginIsolationGuard } from "@/components/provider/app/cross-origin-isolation-guard";
import { ConversationList } from "@/components/pages/sidebar/chat/sidebar/conversation-list";
import { AuthHydration } from "@/components/provider/state/auth-hydration";
import { Suspense } from "react";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

// Pricing is intentionally NOT prefetched here: dehydrating 700+ full model
// objects put ~2.3MB of RSC flight payload in the chat HTML (182KB brotli),
// dominating LCP on slow connections. The model selector fetches it
// client-side right after mount instead.
export default async function ChatLayout(props: Props) {
  await serverLocale(props);
  return (
    <>
      {/* assistant-ui's thread-list runtime reads Math.random at init, which
          prerenders reject in client components; the boundary streams the
          whole chat UI per request instead. */}
      <Suspense>
        <AuthHydration withBestKey>
          <CrossOriginIsolationGuard>
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
          </CrossOriginIsolationGuard>
        </AuthHydration>
      </Suspense>
    </>
  );
}
