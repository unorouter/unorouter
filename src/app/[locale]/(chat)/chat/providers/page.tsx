import { CustomProvidersPage } from "@/components/pages/sidebar/chat/rp/custom-provider/page";
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
    href: "/chat/providers",
    title: t("CHAT.CUSTOM_PROVIDER.TITLE"),
    description: t("CHAT.CUSTOM_PROVIDER.PAGE_SUBTITLE"),
    keywords: t("CHAT.CUSTOM_PROVIDER.TITLE"),
    ogImage: ogBadge("chat", locale),
  });
}

export default function CustomProvidersPageRoute() {
  return <CustomProvidersPage />;
}
