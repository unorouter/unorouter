"use client";

import { usePricingQuery } from "@/hooks/pricing-hook";
import { useTranslations } from "next-intl";

export function HeroSubtitle() {
  const t = useTranslations();
  const { data } = usePricingQuery();

  return (
    <p className="text-muted-foreground mx-auto max-w-lg font-mono text-base leading-relaxed font-light lg:mx-0">
      {t("HOME.HERO_SUBTITLE", {
        modelCount: data?.modelCount ?? 200,
      })}
    </p>
  );
}
