import { getPageMetadata } from "@/lib/config/metadata";
import type { Locale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LoginPageClient } from "./page-client";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;
  const t = await getTranslations({ locale: locale as Locale });
  return getPageMetadata({
    locale,
    title: t("AUTH.META.LOGIN_TITLE"),
    description: t("AUTH.META.LOGIN_DESCRIPTION"),
    keywords: t("AUTH.META.KEYWORDS"),
    path: `/${locale}/login`,
  });
}

export default function LoginPage() {
  return <LoginPageClient />;
}
