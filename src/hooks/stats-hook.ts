"use client";

import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

export function useLiveStatsQuery() {
  return useQuery({
    queryKey: queryKeys.statsLive(),
    queryFn: async () => handleElysia(await rpc.api.stats.live.get()),
    enabled: false,
  });
}

export function useHistoryStatsQuery() {
  return useQuery({
    queryKey: queryKeys.statsHistory(),
    queryFn: async () => handleElysia(await rpc.api.stats.history.get()),
    enabled: false,
  });
}

export function useLiveStats() {
  const { data } = useHistoryStatsQuery();
  const baseTokens = data?.tokenUsed ?? 0;
  const baseRequests = data?.requestCount ?? 0;
  const baseTpm = data?.avgTpm ?? 0;

  const [tokens, setTokens] = useState(baseTokens);
  const [requests, setRequests] = useState(baseRequests);
  const [tpm, setTpm] = useState(baseTpm);
  const [tps, setTps] = useState((baseTpm / 60).toFixed(1));
  const recentTokenIncrements = useRef<number[]>([]);

  useEffect(() => {
    const tokensPerTick = baseTpm / 1200;

    const tokenInterval = setInterval(() => {
      const jitter = 0.5 + Math.random() * 1;
      const increment = Math.max(1, Math.round(tokensPerTick * jitter));
      recentTokenIncrements.current.push(increment);
      if (recentTokenIncrements.current.length > 1200) {
        recentTokenIncrements.current.shift();
      }
      setTokens((v) => v + increment);
    }, 50);

    const requestInterval = setInterval(() => {
      setRequests((v) => v + Math.floor(Math.random() * 3));
    }, 400);

    const tpmInterval = setInterval(() => {
      const recent = recentTokenIncrements.current;
      if (recent.length > 0) {
        const sum = recent.reduce((a, b) => a + b, 0);
        const derivedTpm = Math.round((sum * 1200) / recent.length);
        setTpm(derivedTpm);
        setTps((derivedTpm / 60).toFixed(1));
      }
    }, 200);

    return () => {
      clearInterval(tokenInterval);
      clearInterval(requestInterval);
      clearInterval(tpmInterval);
    };
  }, [baseTpm]);

  return { tokens, requests, tpm, tps };
}
