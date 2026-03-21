"use client";

import { Button } from "@/components/ui/button";
import { useAuthQuery } from "@/hooks/auth-hook";
import { Link } from "@/i18n/navigation";
import { TranslationKey } from "@/lib/config/constants";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

function useGetStartedHref() {
  const authQuery = useAuthQuery();
  return authQuery.data ? "/dashboard" : "/login";
}

export function GetStartedLink(props: {
  className?: string;
  icon?: ReactNode;
  translationKey?: TranslationKey;
}) {
  const t = useTranslations();
  const href = useGetStartedHref();

  return (
    <Link href={href} className={props.className}>
      {props.icon}
      {t(props.translationKey ?? "HOME.HERO_CTA_PRIMARY")}
    </Link>
  );
}

export function GetStartedButton(props: { translationKey: TranslationKey }) {
  const t = useTranslations();
  const href = useGetStartedHref();

  return (
    <Button nativeButton={false} render={<Link href={href} />}>
      {t(props.translationKey)}
    </Button>
  );
}
