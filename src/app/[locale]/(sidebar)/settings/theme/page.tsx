import { ThemePage } from "@/components/pages/sidebar/settings/theme-page";
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
    href: "/settings/theme",
    title: t("THEME.TITLE"),
    description: t("THEME.SUBTITLE"),
    keywords: t("THEME.TITLE"),
  });
}

export default function ThemePageRoute() {
  return <ThemePage />;
}
