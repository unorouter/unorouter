import { RegisterForm } from "@/components/pages/auth/register-form";
import { redirect } from "@/i18n/navigation";
import { APP_VALUES } from "@/lib/config/constants";
import { getPageMetadata } from "@/lib/config/metadata";
import { rpc } from "@/lib/rpc";
import { serverLocale, setCookies } from "@/lib/utils/server";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await serverLocale(props);
  const t = await getTranslations({ locale });
  return getPageMetadata({
    locale,
    title: t("AUTH.META.REGISTER_TITLE", APP_VALUES),
    description: t("AUTH.META.REGISTER_DESCRIPTION", APP_VALUES),
    keywords: t("AUTH.META.KEYWORDS", APP_VALUES),
  });
}

export default async function RegisterPage() {
  const locale = await serverLocale();
  const self = await rpc.api.auth.self.get(await setCookies());

  if (self.data?.data.id) redirect({ href: "/dashboard", locale });

  return <RegisterForm />;
}
