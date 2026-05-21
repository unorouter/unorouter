"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  useBestKeyQuery,
  useCreateTokenMutation,
} from "@/hooks/billing/token-hook";
import { OS } from "@/lib/types/enums";
import { apiKeyAtom, osAtom } from "@/store/client-store";
import { useAtom, useSetAtom } from "jotai";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function useApiKey() {
  const router = useRouter();
  const [os, setOs] = useAtom(osAtom);
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const createMutation = useCreateTokenMutation();
  const setApiKey = useSetAtom(apiKeyAtom);

  const bestKeyQuery = useBestKeyQuery();
  const apiKey = bestKeyQuery.data ?? null;

  // Sync API key into cookie store so server routes can read it
  useEffect(() => {
    setApiKey(apiKey);
  }, [apiKey, setApiKey]);

  // Detect OS on mount
  useEffect(() => {
    if (os) return;
    const ua = navigator.userAgent;
    if (ua.includes("Win")) {
      setOs(OS.WINDOWS);
    } else if (ua.includes("Mac")) {
      setOs(OS.MACOS);
    } else {
      setOs(OS.LINUX);
    }
  }, [os, setOs]);

  const needsToken = isLoggedIn && bestKeyQuery.isSuccess && !apiKey;

  function createToken() {
    createMutation.mutate(
      {
        body: {
          name: "Default",
          remain_quota: 0,
          expired_time: -1,
          unlimited_quota: true,
          model_limits_enabled: false,
          model_limits: "",
          allow_ips: "",
          group: "auto",
          cross_group_retry: true,
        },
      },
      {
        onSuccess: () => {
          bestKeyQuery.refetch();
          router.refresh();
        },
      },
    );
  }

  return {
    os,
    setOs,
    apiKey,
    isLoading: bestKeyQuery.isLoading || createMutation.isPending,
    needsToken,
    createToken,
    isLoggedIn,
  };
}
