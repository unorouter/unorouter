import { PresetsPage } from "@/components/pages/sidebar/chat/rp/presets-page";
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
    href: "/chat/presets",
    title: t("RP.PRESETS_TITLE"),
    description: t("RP.PRESETS_PAGE_SUBTITLE"),
    keywords: t("RP.PRESETS_TITLE"),
  });
}

export default function PresetsPageRoute() {
  return <PresetsPage />;
}
