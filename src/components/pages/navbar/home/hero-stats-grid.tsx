"use client";

import { usePricingCountsQuery } from "@/hooks/models/pricing-hook";
import { useTranslations } from "next-intl";

export function HeroStatsGrid() {
  const t = useTranslations();
  const data = usePricingCountsQuery().data;

  return (
    <div className="border-border grid w-full grid-cols-2 gap-0 border-t md:grid-cols-4">
      <StatCard
        label={t("HOME.STATS.MODELS")}
        value={data ? String(data.modelCount) : "-"}
        indicator={t("HOME.STATS.INDICATOR.GLOBAL")}
      />
      <StatCard
        label={t("HOME.STATS.PROVIDERS")}
        value={data ? `${data.vendorCount}+` : "-"}
        indicator={t("HOME.STATS.INDICATOR.INTEGRATED")}
      />
      <StatCard
        label={t("HOME.STATS.FREE")}
        value={data ? String(data.freeCount) : "-"}
        indicator={t("HOME.STATS.INDICATOR.FREE")}
      />
      <StatCard
        label={t("HOME.STATS.PAID")}
        value={data ? String(data.paidCount) : "-"}
        indicator={t("HOME.STATS.INDICATOR.PAID")}
      />
    </div>
  );
}

function StatCard(props: { label: string; value: string; indicator: string }) {
  return (
    <div className="border-border hover:bg-accent flex cursor-default flex-col border p-5 transition-colors duration-300">
      <span className="text-foreground/70 mb-3 font-mono text-[10px] tracking-widest uppercase">
        {props.label}
      </span>
      {/* Counts come from the 5min pricing snapshot, which can refresh between
          the server render and hydration, so the two legitimately differ.
          Suppress the hydration text mismatch (React #418) - the live client
          value wins. */}
      <span
        suppressHydrationWarning
        className="text-foreground text-2xl font-bold tracking-tight"
      >
        {props.value}
      </span>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-green-500" />
        <span className="text-muted-foreground font-mono text-[10px]">
          {props.indicator}
        </span>
      </div>
    </div>
  );
}
