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
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function useDocs() {
  const router = useRouter();
  const [os, setOs] = useAtom(osAtom);
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const tokensQuery = useTokensQuery({ query: DOCS_TOKEN_PARAMS });
  const createMutation = useCreateTokenMutation();
  const fetchKeyMutation = useFetchTokenKeyMutation();

  const [apiKey, setApiKey] = useAtom(apiKeyAtom);
  const actionRef = useRef<"idle" | "fetching" | "done">("idle");

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

  // Whether user needs to create a token (logged in, tokens loaded, none found)
  const needsToken = isLoggedIn && isTokensLoaded && !targetToken;

  useEffect(() => {
    if (!isLoggedIn || !isTokensLoaded) return;

    if (!targetToken) {
      if (apiKey) setApiKey(null);
      actionRef.current = "idle";
      return;
    }

    if (actionRef.current !== "idle") return;
    if (apiKey) {
      actionRef.current = "done";
      return;
    }

    actionRef.current = "fetching";
    fetchKeyMutation.mutate({ id: targetToken.id }, {
      onSuccess: (data) => {
        setApiKey(`sk-${data.key}`);
        actionRef.current = "done";
      },
      onError: () => {
        actionRef.current = "done";
      },
    });
  }, [isLoggedIn, isTokensLoaded, targetToken, apiKey]);

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
          actionRef.current = "idle";
          router.refresh();
        },
      },
    );
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
