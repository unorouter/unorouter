import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { RpDialogs } from "@/components/pages/sidebar/chat/rp/rp-dialogs";
import { ChatRuntimeProvider } from "@/components/pages/sidebar/chat/runtime/chat-runtime-provider";
import { CrossOriginIsolationGuard } from "@/components/provider/app/cross-origin-isolation-guard";
import { ConversationList } from "@/components/pages/sidebar/chat/sidebar/conversation-list";
import { BestKeyPrefetch } from "@/components/provider/state/best-key-prefetch";
import { Suspense } from "react";

type Props = {
  children: React.ReactNode;
};

// Pricing is intentionally NOT prefetched here: dehydrating 700+ full model
// objects put ~2.3MB of RSC flight payload in the chat HTML (182KB brotli),
// dominating LCP on slow connections. The model selector fetches it
// client-side right after mount instead.
export default function ChatLayout(props: Props) {
  return (
    <>
      <Suspense>
        <BestKeyPrefetch />
      </Suspense>
      <CrossOriginIsolationGuard>
        <ChatRuntimeProvider>
          <SidebarLayout navConfig="chat" chatContent={<ConversationList />}>
            {props.children}
          </SidebarLayout>
          <RpDialogs />
        </ChatRuntimeProvider>
      </CrossOriginIsolationGuard>
    </>
  );
}
