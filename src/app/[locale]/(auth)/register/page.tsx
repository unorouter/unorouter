import { getPageMetadata } from "@/lib/config/metadata";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { RegisterPageClient } from "./page-client";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale: locale as Locale });
  return getPageMetadata({
    locale,
    title: t("AUTH.META.REGISTER_TITLE"),
    description: t("AUTH.META.REGISTER_DESCRIPTION"),
    keywords: t("AUTH.META.KEYWORDS"),
    path: `/${locale}/register`,
  });
}

export default function RegisterPage() {
  return <RegisterPageClient />;
}
