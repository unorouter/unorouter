import { Chat } from "@/components/pages/sidebar/chat/chat";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata, ogBadge } from "@/lib/seo/metadata";
import { fetchConvTitle, serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string; convId: string }>;
};

export async function generateMetadata(props: Props) {
  const { convId } = await props.params;
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  const convTitle = await fetchConvTitle(convId);
  return getPageMetadata({
    locale,
    href: { pathname: "/chat/[convId]", params: { convId } },
    title: convTitle
      ? t("CHAT.META.TITLE_WITH_NAME", { ...APP_VALUES, title: convTitle })
      : t("CHAT.META.TITLE", APP_VALUES),
    description: t("CHAT.META.DESCRIPTION"),
    keywords: t("CHAT.META.KEYWORDS"),
    robots: false,
    ogImage: ogBadge("pricing", locale),
  });
}

export default async function ChatConvPage(props: Props) {
  const { convId } = await props.params;
  return <Chat convId={convId} />;
}
