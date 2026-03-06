import { RegisterForm } from "@/components/pages/auth/register-form";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
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
    title: t("AUTH.META.REGISTER_TITLE"),
    description: t("AUTH.META.REGISTER_DESCRIPTION"),
    keywords: t("AUTH.META.KEYWORDS"),
  });
}

export default async function RegisterPage() {
  const t = await getTranslations();
  return (
    <GlassAuthCard
      title={t("AUTH.REGISTER_TITLE")}
      description={t("AUTH.REGISTER_DESCRIPTION")}
    >
      <RegisterForm />
    </GlassAuthCard>
  );
}
