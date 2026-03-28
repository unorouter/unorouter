"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useCreateTokenMutation,
  useFetchTokenKeyMutation,
  useTokensQuery,
} from "@/hooks/token-hook";
import { apiKeyAtom } from "@/store/docs-store";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";

export function useSuitableToken() {
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const tokensQuery = useTokensQuery({ p: 1 });
  const createMutation = useCreateTokenMutation();
  const fetchKeyMutation = useFetchTokenKeyMutation();

  const [apiKey, setApiKey] = useAtom(apiKeyAtom);
  const [isLoading, setIsLoading] = useState(false);
  const actionRef = useRef<"idle" | "fetching" | "done">("idle");

  const tokens = isLoggedIn ? tokensQuery.data?.items : undefined;
  const isTokensLoaded = isLoggedIn && tokensQuery.isSuccess;

  // Find a suitable token: enabled, unlimited quota, auto group, all models
  const suitableToken = tokens?.find(
    (tok) =>
      tok &&
      tok.status === 1 &&
      tok.unlimited_quota &&
      tok.group === "auto" &&
      !tok.model_limits_enabled,
  );

  // Fall back to any enabled token
  const fallbackToken =
    suitableToken ?? tokens?.find((tok) => tok && tok.status === 1);

  const targetToken = fallbackToken ?? null;

  // Whether user needs to create a token (logged in, tokens loaded, none found)
  const needsToken = isLoggedIn && isTokensLoaded && !targetToken;

  useEffect(() => {
    if (!isLoggedIn || !isTokensLoaded || actionRef.current !== "idle") return;
    if (apiKey) {
      actionRef.current = "done";
      return;
    }

    if (targetToken) {
      actionRef.current = "fetching";
      setIsLoading(true);
      fetchKeyMutation.mutate(targetToken.id, {
        onSuccess: (data) => {
          const fullKey = `sk-${data.key}`;
          setApiKey(fullKey);
          actionRef.current = "done";
          setIsLoading(false);
        },
        onError: () => {
          actionRef.current = "done";
          setIsLoading(false);
        },
      });
    }
  }, [isLoggedIn, isTokensLoaded, targetToken, apiKey]);

  function createToken() {
    setIsLoading(true);
    createMutation.mutate(
      {
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
      {
        onSuccess: () => {
          // Tokens query will refetch via the mutation hook's onSuccess.
          // Reset action so the useEffect can fetch the key on next cycle.
          actionRef.current = "idle";
        },
        onError: () => {
          setIsLoading(false);
        },
      },
    );
  }

  return {
    apiKey,
    isLoading:
      isLoading || tokensQuery.isLoading || createMutation.isPending,
    needsToken,
    createToken,
    isLoggedIn,
  };
}
