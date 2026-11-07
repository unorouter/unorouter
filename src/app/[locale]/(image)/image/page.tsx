import { ImagePageHydrated } from "@/components/pages/sidebar/image/image-page-hydrated";
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
    href: "/image",
    title: t("IMAGE.META_TITLE", APP_VALUES),
    description: t("IMAGE.META_DESC", APP_VALUES),
    keywords: t("METADATA.ACCOUNT.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("hero", locale),
  });
}

export default async function ImageRootPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations({ locale: await serverLocale(props) });
  return (
    <>
      <h1 className="sr-only">{t("IMAGE.META_TITLE", APP_VALUES)}</h1>
      <ImagePageHydrated />
    </>
  );
}
