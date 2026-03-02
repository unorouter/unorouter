"use client";

import { useLiveStats } from "@/hooks/stats-hook";
import { useTranslations } from "next-intl";
import { LuActivity } from "react-icons/lu";

export function StatsPanel() {
  const t = useTranslations();
  const { tokens, requests, tpm } = useLiveStats();

  return (
    <div className="w-full max-w-lg mx-auto lg:mx-0 flex flex-col gap-px bg-border border border-border rounded-lg overflow-hidden backdrop-blur-md">
      {/* Tokens served */}
      <div className="bg-card/80 p-8 flex flex-col justify-center">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {t("HOME.STATS_PANEL_TOKENS_SERVED")}
          </span>
          <LuActivity className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="text-4xl md:text-5xl lg:text-5xl font-bold text-foreground tracking-tight tabular-nums">
          {tokens.toLocaleString()}
        </div>
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card/80 p-6 flex flex-col justify-between h-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
            {t("HOME.STATS_PANEL_REQUESTS")}
          </span>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {requests.toLocaleString()}
          </div>
        </div>
        <div className="bg-card/80 p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {t("HOME.STATS_PANEL_TOKENS_MIN")}
            </span>
            <span className="text-[10px] text-green-500 font-mono">
              {t("HOME.STATS_PANEL_LIVE")}
            </span>
          </div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {tpm.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
