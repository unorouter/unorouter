"use client";

import { LoginLink } from "@/components/elements/brand/login-link";
import { Button } from "@/components/ui/button";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
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
  // Gate on hydrated or the first client render mismatches the logged-out shell.
  const hydrated = useHydrated();
  const label = t(props.translationKey ?? "HOME.HERO.CTA_PRIMARY");

  if (hydrated && authQuery.data) {
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
  const hydrated = useHydrated();

  if (hydrated && authQuery.data) {
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
