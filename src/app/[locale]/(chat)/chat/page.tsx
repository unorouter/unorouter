import { Chat } from "@/components/pages/sidebar/chat/chat";
import { ChatWelcomePlaceholder } from "@/components/pages/sidebar/chat/chat-welcome-placeholder";
import { pageMetadata } from "@/lib/seo/metadata";

export function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  return pageMetadata({
    props,
    namespace: "CHAT",
    href: "/chat",
    badge: "chat",
  });
}

export default function ChatPage() {
  return (
    <div className="chat-shell relative flex min-h-0 min-w-0 flex-1">
      <ChatWelcomePlaceholder />
      <Chat />
    </div>
  );
}
