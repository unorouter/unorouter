"use client";

import { useHistoryStatsQuery } from "@/hooks/ops/stats-hook";
import { useEffect, useRef, useState } from "react";

export function useLiveStats() {
  const { data } = useHistoryStatsQuery();
  const baseTokens = data?.tokenUsed ?? 0;
  const baseRequests = data?.requestCount ?? 0;
  const baseTpm = data?.avgTpm ?? 0;

  const [tokenDelta, setTokenDelta] = useState(0);
  const [requestDelta, setRequestDelta] = useState(0);
  const [tpmDelta, setTpmDelta] = useState(0);
  const recentTokenIncrements = useRef<number[]>([]);

  useEffect(() => {
    if (baseTpm <= 0) return;

    // 250ms ticks: the old 50ms interval meant ~25 renders/sec across the
    // hero + ticker for the page's whole lifetime (INP/TBT cost).
    const TICKS_PER_MINUTE = 240;
    const WINDOW_TICKS = TICKS_PER_MINUTE;
    const tokensPerTick = baseTpm / TICKS_PER_MINUTE;

    const tokenInterval = setInterval(() => {
      const jitter = 0.5 + Math.random() * 1;
      const increment = Math.max(1, Math.round(tokensPerTick * jitter));
      recentTokenIncrements.current.push(increment);
      if (recentTokenIncrements.current.length > WINDOW_TICKS) {
        recentTokenIncrements.current.shift();
      }
      setTokenDelta((d) => d + increment);
    }, 250);

    const requestInterval = setInterval(() => {
      setRequestDelta((d) => d + Math.floor(Math.random() * 6));
    }, 800);

    const tpmInterval = setInterval(() => {
      const recent = recentTokenIncrements.current;
      if (recent.length > 0) {
        const sum = recent.reduce((a, b) => a + b, 0);
        const derivedTpm = Math.round((sum * TICKS_PER_MINUTE) / recent.length);
        setTpmDelta(derivedTpm - baseTpm);
      }
    }, 1000);

    return () => {
      clearInterval(tokenInterval);
      clearInterval(requestInterval);
      clearInterval(tpmInterval);
    };
  }, [baseTpm]);

  const tokens = baseTokens + tokenDelta;
  const requests = baseRequests + requestDelta;
  const tpm = baseTpm + tpmDelta;
  const tps = (tpm / 60).toFixed(1);

  return { tokens, requests, tpm, tps };
}
