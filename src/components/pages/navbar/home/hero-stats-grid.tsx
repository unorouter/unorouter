"use client";

import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { useTranslations } from "next-intl";

export function HeroStatsGrid() {
  const t = useTranslations();
  const { data } = usePricingQuery();

  return (
    <div className="border-border grid w-full grid-cols-3 gap-0 border-t">
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
        label={t("HOME.STATS.UPTIME")}
        value="99.9%"
        indicator={t("HOME.STATS.INDICATOR.SLA")}
      />
    </div>
  );
}

function StatCard(props: { label: string; value: string; indicator: string }) {
  return (
    <div className="border-border hover:bg-accent flex cursor-default flex-col border p-5 transition-colors duration-300">
      <span className="text-muted-foreground mb-3 font-mono text-[10px] tracking-widest uppercase">
        {props.label}
      </span>
      <span className="text-foreground text-2xl font-bold tracking-tight">
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
