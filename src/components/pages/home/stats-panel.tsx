"use client";

import { useHistoryStatsQuery } from "@/hooks/stats-hook";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LuActivity } from "react-icons/lu";

function useLiveStats(baseTokens: number, baseRequests: number, baseTpm: number) {
  const [tokens, setTokens] = useState(baseTokens);
  const [requests, setRequests] = useState(baseRequests);
  const [tpm, setTpm] = useState(baseTpm);
  const recentTokenIncrements = useRef<number[]>([]);

  useEffect(() => {
    // Tokens: increment every 50ms by a random amount scaled to the base tpm
    // baseTpm is tokens/min, so tokens/50ms = baseTpm / (60000/50) = baseTpm / 1200
    const tokensPerTick = baseTpm / 1200;

    const tokenInterval = setInterval(() => {
      const jitter = 0.5 + Math.random() * 1; // 0.5x to 1.5x
      const increment = Math.max(1, Math.round(tokensPerTick * jitter));
      recentTokenIncrements.current.push(increment);
      // Keep last 1200 ticks (= 60s at 50ms interval) for TPM calc
      if (recentTokenIncrements.current.length > 1200) {
        recentTokenIncrements.current.shift();
      }
      setTokens((v) => v + increment);
    }, 50);

    // Requests: increment every 300-600ms
    const requestInterval = setInterval(() => {
      setRequests((v) => v + Math.floor(Math.random() * 3));
    }, 400);

    // TPM: derived from actual token increments over the last window
    const tpmInterval = setInterval(() => {
      const recent = recentTokenIncrements.current;
      if (recent.length > 0) {
        const sum = recent.reduce((a, b) => a + b, 0);
        // Scale to per-minute: each tick is 50ms, so multiply by (60000/50) / count * count = sum * 1200 / count
        // Actually: sum covers `count` ticks of 50ms each = count*50ms
        // Tokens/min = sum / (count * 50 / 60000) = sum * 60000 / (count * 50) = sum * 1200 / count
        const derivedTpm = Math.round((sum * 1200) / recent.length);
        setTpm(derivedTpm);
      }
    }, 200);

    return () => {
      clearInterval(tokenInterval);
      clearInterval(requestInterval);
      clearInterval(tpmInterval);
    };
  }, [baseTpm]);

  return { tokens, requests, tpm };
}

export function StatsPanel() {
  const t = useTranslations();
  const { data } = useHistoryStatsQuery();

  const { tokens, requests, tpm } = useLiveStats(
    data!.tokenUsed,
    data!.requestCount,
    data!.avgTpm
  );

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
          {tokens.toLocaleString()}
        </div>
      </div>

      {/* Sub-stats */}
      <div className="grid grid-cols-2 gap-px bg-white/10">
        <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
            {t("HOME.STATS_PANEL_REQUESTS")}
          </span>
          <div className="text-2xl font-bold text-white tabular-nums">
            {requests.toLocaleString()}
          </div>
        </div>
        <div className="bg-[#0A0A0A]/80 p-6 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
              {t("HOME.STATS_PANEL_TOKENS_MIN")}
            </span>
            <span className="text-[10px] text-green-500 font-mono">
              {t("HOME.STATS_PANEL_LIVE")}
            </span>
          </div>
          <div className="text-2xl font-bold text-white tabular-nums">
            {tpm.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}
