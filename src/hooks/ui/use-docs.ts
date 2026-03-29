"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useCreateTokenMutation,
  useFetchTokenKeyMutation,
  useTokensQuery,
} from "@/hooks/token-hook";
import { DOCS_TOKEN_PARAMS } from "@/lib/config/constants";
import { apiKeyAtom, osAtom } from "@/store/docs-store";
import { useAtom } from "jotai";
import { useEffect } from "react";

// Shared across all useDocs() instances to prevent duplicate key fetches
let keyFetchState: "idle" | "fetching" | "done" = "idle";

export function useDocs() {
  const [os, setOs] = useAtom(osAtom);
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const tokensQuery = useTokensQuery({ query: DOCS_TOKEN_PARAMS });
  const createMutation = useCreateTokenMutation();
  const fetchKeyMutation = useFetchTokenKeyMutation();

  const [apiKey, setApiKey] = useAtom(apiKeyAtom);

  // Detect OS on mount
  useEffect(() => {
    if (os) return;
    const ua = navigator.userAgent;
    if (ua.includes("Win")) {
      setOs("windows");
    } else if (ua.includes("Mac")) {
      setOs("macos");
    } else {
      setOs("linux");
    }
  }, [os, setOs]);

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

  const fallbackToken =
    suitableToken ?? tokens?.find((tok) => tok && tok.status === 1);

  const targetToken = fallbackToken ?? null;
  const targetTokenId = targetToken?.id ?? null;

  // Whether user needs to create a token (logged in, tokens loaded, none found)
  const needsToken = isLoggedIn && isTokensLoaded && !targetToken;

  // Fetch key for existing token on initial load
  useEffect(() => {
    if (!isLoggedIn || !isTokensLoaded || !targetTokenId) {
      if (apiKey) setApiKey(null);
      keyFetchState = "idle";
      return;
    }

    if (keyFetchState !== "idle") return;
    if (apiKey) {
      keyFetchState = "done";
      return;
    }

    keyFetchState = "fetching";
    fetchKeyMutation.mutate(
      { id: targetTokenId },
      {
        onSuccess: (data) => {
          setApiKey(`sk-${data.key}`);
          keyFetchState = "done";
        },
        onError: () => {
          keyFetchState = "done";
        },
      },
    );
  }, [isLoggedIn, isTokensLoaded, targetTokenId, apiKey]);

  async function createToken() {
    // Mark as non-idle so the effect doesn't also try to fetch the key
    keyFetchState = "fetching";

    await createMutation.mutateAsync({
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
    });

    // Refetch tokens via React Query to update cache and get the new token's ID
    const refetchResult = await tokensQuery.refetch();
    const newToken = refetchResult.data?.items?.find(
      (tok) =>
        tok &&
        tok.status === 1 &&
        tok.unlimited_quota &&
        tok.group === "auto" &&
        !tok.model_limits_enabled,
    );

    if (newToken) {
      const keyData = await fetchKeyMutation.mutateAsync({ id: newToken.id });
      setApiKey(`sk-${keyData.key}`);
    }

    keyFetchState = "done";
  }

  return {
    os,
    setOs,
    apiKey,
    isLoading:
      fetchKeyMutation.isPending ||
      tokensQuery.isLoading ||
      createMutation.isPending,
    needsToken,
    createToken,
    isLoggedIn,
  };
}
