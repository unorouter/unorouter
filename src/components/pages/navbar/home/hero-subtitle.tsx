"use client";

import { usePricingCountsQuery } from "@/hooks/models/pricing-hook";
import { APP_VALUES } from "@/lib/config/constants";
import { useTranslations } from "next-intl";

export function HeroSubtitle() {
  const t = useTranslations();
  const modelCount = usePricingCountsQuery().data?.modelCount ?? 0;

  return (
    // modelCount comes from the 5min pricing snapshot, which can refresh
    // between the server render and hydration, so the two legitimately differ.
    // Suppress the hydration text mismatch (React #418) - the client value wins.
    <p
      suppressHydrationWarning
      className="text-muted-foreground mx-auto max-w-lg font-mono text-base leading-relaxed font-light lg:mx-0"
    >
      {t("HOME.HERO.SUBTITLE", {
        modelCount: String(modelCount),
        ...APP_VALUES,
      })}
    </p>
  );
}
