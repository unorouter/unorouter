"use client";

import { RegisterForm } from "@/components/pages/auth/register-form";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const t = useTranslations();

  return (
    <GlassAuthCard
      title={t("AUTH.REGISTER_TITLE")}
      description={t("AUTH.REGISTER_DESCRIPTION")}
    >
      <RegisterForm />
    </GlassAuthCard>
  );
}
