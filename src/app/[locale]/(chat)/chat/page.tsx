import { Chat } from "@/components/pages/sidebar/chat/chat";
import { ChatWelcomePlaceholder } from "@/components/pages/sidebar/chat/chat-welcome-placeholder";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/chat",
    title: t("CHAT.META.TITLE", APP_VALUES),
    description: t("CHAT.META.DESCRIPTION"),
    keywords: t("CHAT.META.KEYWORDS"),
    ogImage: ogBadge("chat", locale),
  });
}

export default async function ChatPage(props: {
  params: Promise<{ locale: string }>;
}) {
  await serverLocale(props);
  return (
    <div className="chat-shell relative flex min-h-0 min-w-0 flex-1">
      <ChatWelcomePlaceholder />
      <Chat />
    </div>
  );
}
