"use client";

import { useLiveStats } from "@/hooks/ui/use-live-stats";
import { useTranslations } from "next-intl";
import { LuActivity } from "react-icons/lu";

export function StatsPanel() {
  const t = useTranslations();
  const { tokens, requests, tpm } = useLiveStats();

  return (
    <div className="bg-border border-border mx-auto flex w-full max-w-lg flex-col gap-px overflow-hidden rounded-lg border backdrop-blur-md lg:mx-0">
      {/* Tokens served */}
      <div className="bg-card/80 flex flex-col justify-center p-8">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-foreground/60 flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            {t("HOME.STATS.PANEL.TOKENS_SERVED")}
          </span>
          <LuActivity className="text-muted-foreground h-3.5 w-3.5" />
        </div>
        <div className="text-foreground text-4xl font-bold tracking-tight tabular-nums md:text-5xl lg:text-5xl">
          {tokens.toLocaleString()}
        </div>
      </div>

      {/* Sub-stats */}
      <div className="bg-border grid grid-cols-2 gap-px">
        <div className="bg-card/80 flex h-full flex-col justify-between p-6">
          <span className="text-foreground/60 mb-2 font-mono text-[10px] tracking-widest uppercase">
            {t("HOME.STATS.PANEL.REQUESTS")}
          </span>
          <div className="text-foreground text-2xl font-bold tabular-nums">
            {requests.toLocaleString()}
          </div>
        </div>
        <div className="bg-card/80 flex h-full flex-col justify-between p-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-foreground/60 font-mono text-[10px] tracking-widest uppercase">
              {t("HOME.STATS.PANEL.TOKENS_MIN")}
            </span>
            <span className="font-mono text-[10px] text-green-500">
              {t("HOME.STATS.PANEL.LIVE")}
            </span>
          </div>
          <div className="text-foreground text-2xl font-bold tabular-nums">
            {tpm.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
