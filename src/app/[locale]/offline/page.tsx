import { OfflineFallback } from "@/components/elements/feedback/offline-fallback";
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
    href: "/offline",
    title: t("MAIN.OFFLINE.TITLE"),
    description: t("MAIN.OFFLINE.DESCRIPTION"),
    keywords: t("METADATA.KEYWORDS"),
  });
}

    // Static shell precached by the SW as the offline fallback; no auth/SQLocal/React Query so it works with zero network.
export default function OfflinePage() {
  return <OfflineFallback />;
}
