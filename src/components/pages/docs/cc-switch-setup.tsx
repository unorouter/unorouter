"use client";

import { Button } from "@/components/ui/button";
import { useAuthQuery } from "@/hooks/auth-hook";
import {
  useCreateTokenMutation,
  useFetchTokenKeyMutation,
  useTokensQuery,
} from "@/hooks/token-hook";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  LuArrowLeftRight,
  LuExternalLink,
  LuKey,
  LuLoader,
} from "react-icons/lu";

type CCSwitchApp = "claude" | "codex" | "gemini" | "openclaw";

interface CCSwitchSetupProps {
  app: CCSwitchApp;
  endpoint: string;
  cliCodeBlock: ReactNode;
}

function buildDeepLink(app: CCSwitchApp, endpoint: string, apiKey?: string) {
  const params = new URLSearchParams({
    resource: "provider",
    app,
    name: "UnoRouter",
    endpoint,
  });
  if (apiKey) {
    params.set("apiKey", apiKey);
  }
  return `ccswitch://v1/import?${params.toString()}`;
}

function useSuitableToken(isLoggedIn: boolean) {
  const tokensQuery = useTokensQuery({ p: 1 });
  const createMutation = useCreateTokenMutation();
  const fetchKeyMutation = useFetchTokenKeyMutation();

  const [resolvedKey, setResolvedKey] = useState<string | null>(null);
  const actionRef = useRef<"idle" | "creating" | "fetching" | "done">("idle");

  const tokens = isLoggedIn ? tokensQuery.data?.items : undefined;
  const isTokensLoaded = isLoggedIn && tokensQuery.isSuccess;

  // Find a suitable token: enabled, unlimited quota, auto group
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

  // Use the best available token, or create one if none exist
  const targetToken = fallbackToken ?? null;

  useEffect(() => {
    if (!isLoggedIn || !isTokensLoaded || actionRef.current !== "idle") return;

    if (targetToken) {
      // Fetch the key for the existing token
      actionRef.current = "fetching";
      fetchKeyMutation.mutate(targetToken.id, {
        onSuccess: (data) => {
          setResolvedKey(data.key);
          actionRef.current = "done";
        },
        onError: () => {
          actionRef.current = "done";
        },
      });
    } else if (tokens && tokens.length === 0) {
      // No tokens at all, auto-create one
      actionRef.current = "creating";
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
            // After creation, the tokens query will refetch via onSuccess in the hook.
            // Reset action so we can fetch the key on the next render cycle.
            actionRef.current = "idle";
          },
          onError: () => {
            actionRef.current = "done";
          },
        },
      );
    }
  }, [isLoggedIn, isTokensLoaded, targetToken, tokens]);

  const isLoading =
    tokensQuery.isLoading ||
    createMutation.isPending ||
    fetchKeyMutation.isPending;

  return { resolvedKey, isLoading };
}

export function CCSwitchSetup(props: CCSwitchSetupProps) {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const { resolvedKey, isLoading } = useSuitableToken(isLoggedIn);

  const deepLink = buildDeepLink(
    props.app,
    props.endpoint,
    resolvedKey ? `sk-${resolvedKey}` : undefined,
  );

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-semibold" id="cc-switch-setup">
        {t("DOCS.CC_SWITCH_SETUP_TITLE")}
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        {t("DOCS.CC_SWITCH_SETUP_DESC")}
      </p>

      <div className="border-border bg-card rounded-lg border p-6">
        <a href={deepLink} className="block">
          <Button className="w-full gap-2" size="lg" disabled={isLoading}>
            {isLoading ? (
              <LuLoader className="size-4 animate-spin" />
            ) : (
              <LuArrowLeftRight className="size-4" />
            )}
            {t("DOCS.CC_SWITCH_SETUP_BUTTON")}
            <LuExternalLink className="size-3.5" />
          </Button>
        </a>

        {!isLoggedIn && (
          <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
            <LuKey className="size-3" />
            <Link href="/login" className="text-primary underline">
              {t("DOCS.CC_SWITCH_SETUP_LOGIN_REQUIRED")}
            </Link>
          </p>
        )}

        <div className="mt-6">
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            {t("DOCS.CC_SWITCH_SETUP_CLI_ALT")}
          </p>
          {props.cliCodeBlock}
        </div>

        <p className="text-muted-foreground mt-4 text-xs">
          {t("DOCS.CC_SWITCH_SETUP_NO_APP")}{" "}
          <a
            href="/docs/cc-switch#installation"
            className="text-primary underline"
          >
            {t("DOCS.CC_SWITCH_SETUP_INSTALL_LINK")}
          </a>
        </p>
      </div>
    </section>
  );
}
