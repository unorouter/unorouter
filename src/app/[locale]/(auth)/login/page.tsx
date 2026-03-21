import { LoginForm } from "@/components/pages/auth/login-form";
import { redirect } from "@/i18n/navigation";
import { APP_VALUES, AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { rpc } from "@/lib/rpc";
import { serverLocale, setCookies } from "@/lib/utils/server";
import { getCookie } from "cookies-next/server";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";

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
  });
}

export default async function LoginPage() {
  const locale = await serverLocale();
  const self = await rpc.api.auth.self.get(await setCookies());

  if (self.data?.data.id) {
    const redirectTo = await getCookie(AUTH_REDIRECT_COOKIE, { cookies });
    redirect({ href: (redirectTo as string) || "/dashboard", locale });
  }

  return <LoginForm />;
}
