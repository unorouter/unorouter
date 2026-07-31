import { ImagePage } from "@/components/pages/sidebar/image/image-page";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/seo/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

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
    robots: false,
  });
}

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ snap?: string }>;
};

async function Inner(props: PageProps) {
  const params = await props.params;
  const search = await props.searchParams;
  return (
    <ImagePage sessionId={params.id} snapshotId={search.snap ?? undefined} />
  );
}

export default function ImageSessionPage(props: PageProps) {
  return (
    <Suspense>
      <Inner params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
