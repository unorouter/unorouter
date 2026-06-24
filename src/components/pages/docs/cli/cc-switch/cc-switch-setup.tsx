"use client";

import { Button } from "@/components/ui/button";
import { useDeepLink } from "@/hooks/ui/use-deep-link";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { env } from "@/lib/config/env";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

type CCSwitchApp = "claude" | "codex" | "gemini" | "openclaw";

interface CCSwitchSetupProps {
  app: CCSwitchApp;
  endpoint: string;
  cliCodeBlock: ReactNode;
}

export function CCSwitchSetup(props: CCSwitchSetupProps) {
  const t = useTranslations();
  const token = useApiKey();
  const { showInstall, installRef, openDeepLink } = useDeepLink();

  const deepLinkParams = new URLSearchParams({
    resource: "provider",
    app: props.app,
    name: env.appName,
    endpoint: props.endpoint,
  });
  if (token.apiKey) {
    deepLinkParams.set("apiKey", token.apiKey);
  }
  const deepLink = `ccswitch://v1/import?${deepLinkParams.toString()}`;

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-semibold" id="cc-switch-setup">
        {t("DOCS.SETUP.TITLE")}
      </h2>
      <p className="text-muted-foreground mb-6 text-sm">
        {t("DOCS.SETUP.DESC")}
      </p>

      <div className="border-border bg-card rounded-lg border p-6">
        <a
          href={deepLink}
          className="block"
          onClick={(e) => openDeepLink(e, deepLink)}
        >
          <Button
            className="w-full gap-2"
            size="lg"
            disabled={token.isLoading || !token.apiKey}
          >
            {token.isLoading ? (
              <Icon name="loader" className="size-4 animate-spin" />
            ) : (
              <Icon name="arrow-left-right" className="size-4" />
            )}
            {t("DOCS.SETUP.BUTTON")}
            <Icon name="external-link" className="size-3.5" />
          </Button>
        </a>

        {!token.isLoggedIn && (
          <p className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
            <Icon name="key" className="size-3" />
            <Link href="/login" className="text-primary underline">
              {t("DOCS.SETUP.LOGIN_REQUIRED")}
            </Link>
          </p>
        )}

        {token.isLoggedIn && token.needsToken && (
          <div className="mt-3 flex items-center gap-2">
            <Icon
              name="key"
              className="text-muted-foreground size-3.5 shrink-0"
            />
            <span className="text-muted-foreground text-xs">
              {t("DOCS.GENERATE_API_KEY_DESC")}
            </span>
            <Button
              size="xs"
              variant="outline"
              className="ml-auto shrink-0 gap-1.5"
              onClick={token.createToken}
              disabled={token.isLoading}
            >
              {token.isLoading ? (
                <Icon name="loader" className="size-3 animate-spin" />
              ) : (
                <Icon name="plus" className="size-3" />
              )}
              {t("DOCS.GENERATE_API_KEY")}
            </Button>
          </div>
        )}

        {showInstall && (
          <div
            ref={installRef}
            className="animate-in fade-in slide-in-from-top-2 mt-3 flex items-center gap-2"
          >
            <Icon
              name="circle-alert"
              className="text-muted-foreground size-3.5 shrink-0"
            />
            <span className="text-muted-foreground text-xs">
              {t("DOCS.SETUP.NO_APP")}
            </span>
            <Button
              nativeButton={false}
              size="xs"
              variant="outline"
              className="ml-auto shrink-0 gap-1.5"
              render={
                <Link
                  href={{ pathname: "/docs/cc-switch", hash: "installation" }}
                />
              }
            >
              <Icon name="download" className="size-3" />
              {t("DOCS.SETUP.INSTALL_LINK")}
            </Button>
          </div>
        )}

        <div className="mt-6">
          <p className="text-muted-foreground mb-2 text-sm font-medium">
            {t("DOCS.SETUP.CLI_ALT")}
          </p>
          {props.cliCodeBlock}
        </div>
      </div>
    </section>
  );
}
