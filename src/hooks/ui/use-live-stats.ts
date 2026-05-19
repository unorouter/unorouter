"use client";

import { useHistoryStatsQuery } from "@/hooks/ops/stats-hook";
import { useEffect, useRef, useState } from "react";

export function useLiveStats() {
  const { data } = useHistoryStatsQuery();
  const baseTokens = data?.tokenUsed ?? 0;
  const baseRequests = data?.requestCount ?? 0;
  const baseTpm = data?.avgTpm ?? 0;

  // Track accumulated increments (not absolute values) so the display
  // value is always base + delta. When the base jumps from 0 to the real
  // hydrated value, the display follows automatically with no sync effect.
  const [tokenDelta, setTokenDelta] = useState(0);
  const [requestDelta, setRequestDelta] = useState(0);
  const [tpmDelta, setTpmDelta] = useState(0);
  const recentTokenIncrements = useRef<number[]>([]);

  useEffect(() => {
    if (baseTpm <= 0) return;

    const tokensPerTick = baseTpm / 1200;

    const tokenInterval = setInterval(() => {
      const jitter = 0.5 + Math.random() * 1;
      const increment = Math.max(1, Math.round(tokensPerTick * jitter));
      recentTokenIncrements.current.push(increment);
      if (recentTokenIncrements.current.length > 1200) {
        recentTokenIncrements.current.shift();
      }
      setTokenDelta((d) => d + increment);
    }, 50);

    const requestInterval = setInterval(() => {
      setRequestDelta((d) => d + Math.floor(Math.random() * 3));
    }, 400);

    const tpmInterval = setInterval(() => {
      const recent = recentTokenIncrements.current;
      if (recent.length > 0) {
        const sum = recent.reduce((a, b) => a + b, 0);
        const derivedTpm = Math.round((sum * 1200) / recent.length);
        setTpmDelta(derivedTpm - baseTpm);
      }
    }, 200);

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
