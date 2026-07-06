"use client";

import {
  ApiKeyActions,
  GenerateKeyBanner,
} from "@/components/elements/code/api-key-actions";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { useDeepLink } from "@/hooks/ui/use-deep-link";
import { Link } from "@/i18n/navigation";
import { env } from "@/lib/config/env";
import { apiKeyRevealedAtom, obfuscateApiKey } from "@/store/client-store";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

type DeepLinkApp = {
  label: string;
  app: string;
  suffix: string;
};

interface CCSwitchDeepLinksProps {
  apps: DeepLinkApp[];
  apiUrl: string;
  cliCodeBlock: ReactNode;
}

export function CCSwitchDeepLinks(props: CCSwitchDeepLinksProps) {
  const t = useTranslations();
  const token = useApiKey();
  const revealed = useAtomValue(apiKeyRevealedAtom);
  const { showInstall, installRef, openDeepLink } = useDeepLink();

  const displayKey = token.apiKey
    ? revealed
      ? token.apiKey
      : obfuscateApiKey(token.apiKey)
    : null;

  function buildDeepLink(app: DeepLinkApp) {
    const params = new URLSearchParams({
      resource: "provider",
      app: app.app,
      name: env.appName,
      endpoint: `${props.apiUrl}${app.suffix}`,
    });
    if (token.apiKey) {
      params.set("apiKey", token.apiKey);
    }
    return `ccswitch://v1/import?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      {token.apiKey && (
        <div className="border-border bg-card flex items-center gap-3 rounded-lg border px-4 py-3">
          <Icon name="key" className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-mono text-sm">
            {displayKey}
          </span>
          <div className="flex items-center gap-1">
            <ApiKeyActions copyText={token.apiKey} />
          </div>
        </div>
      )}

      {!token.isLoggedIn && (
        <div className="border-border bg-card flex items-center gap-2 rounded-lg border px-4 py-3">
          <Icon
            name="key"
            className="text-muted-foreground size-3.5 shrink-0"
          />
          <Link href="/login" className="text-primary text-sm underline">
            {t("DOCS.SETUP.LOGIN_REQUIRED")}
          </Link>
        </div>
      )}

      {token.isLoggedIn && token.needsToken && (
        <GenerateKeyBanner token={token} className="py-3" />
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {props.apps.map((app) => (
          <a
            key={app.app}
            href={buildDeepLink(app)}
            onClick={(e) => openDeepLink(e, buildDeepLink(app))}
          >
            <Button
              className="w-full gap-2"
              variant="outline"
              size="lg"
              disabled={token.isLoading}
            >
              {token.isLoading ? (
                <Icon name="loader" className="size-4 animate-spin" />
              ) : (
                <Icon name="external-link" className="size-4" />
              )}
              {app.label}
            </Button>
          </a>
        ))}
      </div>

      {showInstall && (
        <div
          ref={installRef}
          className="border-border bg-card animate-in fade-in slide-in-from-top-2 flex items-center gap-3 rounded-lg border px-4 py-3"
        >
          <Icon
            name="circle-alert"
            className="text-muted-foreground size-4 shrink-0"
          />
          <span className="text-muted-foreground text-sm">
            {t("DOCS.SETUP.NO_APP")}
          </span>
          <Button
            nativeButton={false}
            size="xs"
            variant="outline"
            className="ml-auto shrink-0 gap-1.5"
            render={
              <Link
                href={{
                  pathname: "/docs/integrations/cc-switch",
                  hash: "installation",
                }}
              />
            }
          >
            <Icon name="download" className="size-3" />
            {t("DOCS.SETUP.INSTALL_LINK")}
          </Button>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-sm font-medium">
          <Icon name="terminal" className="size-3.5" />
          {t("DOCS.CC_SWITCH.CLI_ALTERNATIVE")}
        </p>
        {props.cliCodeBlock}
      </div>
    </div>
  );
}
