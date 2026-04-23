"use client";

import { LoginLink } from "@/components/elements/auth/login-link";
import { Button } from "@/components/ui/button";
import { useAuthQuery } from "@/hooks/auth-hook";
import { Link } from "@/i18n/navigation";
import { TranslationKey } from "@/lib/config/constants";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

export function GetStartedLink(props: {
  className?: string;
  icon?: ReactNode;
  translationKey?: TranslationKey;
}) {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const label = t(props.translationKey ?? "HOME.HERO.CTA_PRIMARY");

  if (authQuery.data) {
    return (
      <Link href="/dashboard" className={props.className}>
        {props.icon}
        {label}
      </Link>
    );
  }

  return (
    <LoginLink className={props.className}>
      {props.icon}
      {label}
    </LoginLink>
  );
}

export function GetStartedButton(props: {
  translationKey: TranslationKey;
  authedTranslationKey?: TranslationKey;
}) {
  const t = useTranslations();
  const authQuery = useAuthQuery();

  if (authQuery.data) {
    return (
      <Button nativeButton={false} render={<Link href="/dashboard" />}>
        {t(props.authedTranslationKey ?? props.translationKey)}
      </Button>
    );
  }

  return (
    <Button nativeButton={false} render={<LoginLink />}>
      {t(props.translationKey)}
    </Button>
  );
}
