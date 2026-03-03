"use client";

import { LoginForm } from "@/components/pages/auth/login-form";
import { GlassAuthCard } from "@/components/ui/glass-auth-card";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const t = useTranslations();

  return (
    <GlassAuthCard
      title={t("AUTH.LOGIN_TITLE")}
      description={t("AUTH.LOGIN_DESCRIPTION")}
    >
      <LoginForm />
    </GlassAuthCard>
  );
}
