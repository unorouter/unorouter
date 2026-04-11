import { LoginForm } from "@/components/pages/auth/login-form";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { serverLocale } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("AUTH.META.LOGIN_TITLE", APP_VALUES),
    description: t("AUTH.META.LOGIN_DESCRIPTION", APP_VALUES),
    keywords: t("AUTH.META.KEYWORDS", APP_VALUES),
    ogImage: `/api/badge/hero?format=png&theme=dark&locale=${locale}`,
  });
}

export default async function LoginPage() {
  return <LoginForm />;
}
