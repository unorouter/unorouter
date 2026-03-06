import { LoginForm } from "@/components/pages/auth/login-form";
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
    title: t("AUTH.META.LOGIN_TITLE"),
    description: t("AUTH.META.LOGIN_DESCRIPTION"),
    keywords: t("AUTH.META.KEYWORDS"),
  });
}

export default async function LoginPage() {
  return <LoginForm />;
}
