import { Chat } from "@/components/pages/sidebar/chat/chat";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; convId: string }>;
};

// Chat is local-first (conversations live only in the browser OPFS DB), so the
// server has no conversation title to render; the metadata is always generic.
export async function generateMetadata(props: Props) {
  const { convId } = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: { pathname: "/chat/[convId]", params: { convId } },
    title: t("CHAT.META.TITLE", APP_VALUES),
    description: t("CHAT.META.DESCRIPTION"),
    keywords: t("CHAT.META.KEYWORDS"),
    robots: false,
    ogImage: ogBadge("chat", locale),
  });
}

export default async function ChatConvPage(props: Props) {
  const { convId } = await props.params;
  return <Chat convId={convId} />;
}
