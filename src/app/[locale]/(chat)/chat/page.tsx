import { Chat } from "@/components/pages/chat/chat";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("CHAT.META.TITLE", APP_VALUES),
    description: t("CHAT.META.DESCRIPTION"),
    keywords: t("CHAT.META.KEYWORDS"),
    path: `/${locale}/chat`,
    robots: false,
    ogImage: `/api/badge/pricing?format=png&theme=dark&locale=${locale}`,
  });
}

export default function ChatPage() {
  return <Chat />;
}
