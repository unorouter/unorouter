"use client";

import { useTokenStatsQuery } from "@/hooks/stats-hook";
import { useTranslations } from "next-intl";
import { LuActivity } from "react-icons/lu";

export function StatsPanel() {
  const t = useTranslations();
  const { data } = useTokenStatsQuery();

  const tokenUsed = data?.tokenUsed ?? null;
  const requestCount = data?.requestCount ?? null;
  const tpm = data?.tpm ?? null;

  return (
    <div className="w-full max-w-lg mx-auto lg:mx-0 flex flex-col gap-px bg-white/10 border border-white/10 rounded-lg overflow-hidden backdrop-blur-md">
      {/* Tokens served */}
      <div className="bg-[#0A0A0A]/80 p-8 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {t("HOME.STATS_PANEL_TOKENS_SERVED")}
          </span>
          <LuActivity className="h-3.5 w-3.5 text-gray-600" />
        </div>
        <div className="text-4xl md:text-5xl lg:text-5xl font-bold text-white tracking-tight tabular-nums">
          {tokenUsed !== null ? tokenUsed.toLocaleString() : "—"}
        </div>
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-2 gap-px bg-white/10">
        <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
            {t("HOME.STATS_PANEL_REQUESTS")}
          </span>
          <div className="text-2xl font-bold text-white tabular-nums">
            {requestCount !== null ? requestCount.toLocaleString() : "—"}
          </div>
        </div>
        <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
            {t("HOME.STATS_PANEL_TOKENS_MIN")}
          </span>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white tabular-nums">
              {tpm !== null ? tpm.toLocaleString() : "—"}
            </div>
            <span className="text-[10px] text-green-500 mt-1 font-mono">
              {t("HOME.STATS_PANEL_LIVE")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
