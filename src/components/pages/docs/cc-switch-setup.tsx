"use client";

import { Button } from "@/components/ui/button";
import { useAuthQuery } from "@/hooks/auth-hook";
import { useFetchTokenKeyMutation, useTokensQuery } from "@/hooks/token-hook";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import * as React from "react";
import { LuArrowLeftRight, LuExternalLink, LuKey } from "react-icons/lu";

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

export function CCSwitchSetup(props: CCSwitchSetupProps) {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;

  const tokensQuery = useTokensQuery({ p: 1 });
  const fetchKeyMutation = useFetchTokenKeyMutation();

  const firstToken = tokensQuery.data?.items?.[0];
  const [resolvedKey, setResolvedKey] = React.useState<string | null>(null);
  const fetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (isLoggedIn && firstToken && !resolvedKey && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchKeyMutation.mutate(firstToken.id, {
        onSuccess: (data) => {
          setResolvedKey(data.key);
        },
      });
    }
  }, [isLoggedIn, firstToken, resolvedKey, fetchKeyMutation]);

  const deepLink = buildDeepLink(
    props.app,
    props.endpoint,
    resolvedKey ? `sk-${resolvedKey}` : undefined,
  );

  return (
    <section className="mt-10" id="cc-switch-setup">
      <h2 className="mb-4 text-2xl font-semibold">
        {t("DOCS.CC_SWITCH_SETUP_TITLE")}
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        {t("DOCS.CC_SWITCH_SETUP_DESC")}
      </p>

      <div className="border-border bg-card rounded-lg border p-6">
        <a href={deepLink} className="block">
          <Button className="w-full gap-2" size="lg">
            <LuArrowLeftRight className="size-4" />
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

        {isLoggedIn && !firstToken && (
          <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
            <LuKey className="size-3" />
            <Link href="/token" className="text-primary underline">
              {t("DOCS.CC_SWITCH_SETUP_CREATE_KEY")}
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
