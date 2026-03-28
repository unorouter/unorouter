"use client";

import { Button } from "@/components/ui/button";
import { useSuitableToken } from "@/hooks/use-suitable-token";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  LuArrowLeftRight,
  LuExternalLink,
  LuKey,
  LuLoader,
  LuPlus,
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

export function CCSwitchSetup(props: CCSwitchSetupProps) {
  const t = useTranslations();
  const { apiKey, isLoading, needsToken, createToken, isLoggedIn } =
    useSuitableToken();

  const deepLink = buildDeepLink(props.app, props.endpoint, apiKey ?? undefined);

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

        {isLoggedIn && needsToken && (
          <div className="mt-3 flex items-center gap-2">
            <LuKey className="text-muted-foreground size-3.5 shrink-0" />
            <span className="text-muted-foreground text-xs">
              {t("DOCS.GENERATE_API_KEY_DESC")}
            </span>
            <Button
              size="xs"
              variant="outline"
              className="ml-auto shrink-0 gap-1.5"
              onClick={createToken}
              disabled={isLoading}
            >
              {isLoading ? (
                <LuLoader className="size-3 animate-spin" />
              ) : (
                <LuPlus className="size-3" />
              )}
              {t("DOCS.GENERATE_API_KEY")}
            </Button>
          </div>
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
