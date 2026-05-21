import { CardsPage } from "@/components/pages/sidebar/chat/rp/card/page";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    href: "/chat/cards",
    title: t("RP.CARDS_TITLE"),
    description: t("RP.CARDS_PAGE_SUBTITLE"),
    keywords: t("RP.CARDS_TITLE"),
  });
}

export default function CardsPageRoute() {
  return <CardsPage />;
}
