import { ResetPasswordForm } from "@/components/pages/auth/reset-password-form";
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
    href: "/reset",
    title: t("AUTH.META.RESET_PASSWORD_TITLE", APP_VALUES),
    description: t("AUTH.META.RESET_PASSWORD_DESCRIPTION", APP_VALUES),
    keywords: t("AUTH.META.KEYWORDS", APP_VALUES),
    ogImage: ogBadge("hero", locale),
  });
}

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const search = await props.searchParams;
  return <ResetPasswordForm email={search.email} token={search.token} />;
}
