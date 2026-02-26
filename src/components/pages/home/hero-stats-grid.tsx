"use client";

import { usePricingQuery } from "@/hooks/pricing-hook";
import { useTranslations } from "next-intl";

export function HeroStatsGrid() {
  const t = useTranslations();
  const { data } = usePricingQuery();

  return (
    <div className="grid grid-cols-3 gap-0 border-t border-white/10 w-full">
      <StatCard
        label={t("HOME.STATS_MODELS")}
        value={data ? String(data.modelCount) : "—"}
        indicator={t("HOME.STATS_INDICATOR_GLOBAL")}
      />
      <StatCard
        label={t("HOME.STATS_PROVIDERS")}
        value={data ? `${data.vendorCount}+` : "—"}
        indicator={t("HOME.STATS_INDICATOR_INTEGRATED")}
      />
      <StatCard
        label={t("HOME.STATS_UPTIME")}
        value="99.9%"
        indicator={t("HOME.STATS_INDICATOR_SLA")}
      />
    </div>
  );
}

function StatCard(props: { label: string; value: string; indicator: string }) {
  return (
    <div className="flex flex-col border border-white/10 p-5 hover:bg-white/2 transition-colors duration-300 cursor-default">
      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">
        {props.label}
      </span>
      <span className="text-2xl font-bold text-white tracking-tight">
        {props.value}
      </span>
      <div className="flex items-center gap-2 mt-2">
        <div className="w-1 h-1 bg-green-500 rounded-full" />
        <span className="text-[10px] font-mono text-gray-400">
          {props.indicator}
        </span>
      </div>
    </div>
  );
}
