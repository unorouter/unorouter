"use client";

import { Button } from "@/components/ui/button";
import { useDeepLink } from "@/hooks/ui/use-deep-link";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { env } from "@/lib/config/env";
import { Link } from "@/i18n/navigation";
import { apiKeyRevealedAtom, obfuscateApiKey } from "@/store/client-store";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import {
  LuCircleAlert,
  LuDownload,
  LuExternalLink,
  LuEye,
  LuEyeOff,
  LuKey,
  LuLoader,
  LuPlus,
  LuTerminal,
} from "react-icons/lu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CopyButton } from "@/components/elements/code/copy-button";

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
  const [revealed, setRevealed] = useAtom(apiKeyRevealedAtom);
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
      {/* API Key display */}
      {token.apiKey && (
        <div className="border-border bg-card flex items-center gap-3 rounded-lg border px-4 py-3">
          <LuKey className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-mono text-sm">
            {displayKey}
          </span>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setRevealed(!revealed)}
                  />
                }
              >
                {revealed ? (
                  <LuEyeOff className="size-3.5" />
                ) : (
                  <LuEye className="size-3.5" />
                )}
              </TooltipTrigger>
              <TooltipContent>
                {revealed
                  ? t("TOKEN.KEY_DISPLAY.HIDE")
                  : t("TOKEN.KEY_DISPLAY.REVEAL")}
              </TooltipContent>
            </Tooltip>
            <CopyButton
              text={token.apiKey}
              className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-sm p-1.5 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Login or generate key prompts */}
      {!token.isLoggedIn && (
        <div className="border-border bg-card flex items-center gap-2 rounded-lg border px-4 py-3">
          <LuKey className="text-muted-foreground size-3.5 shrink-0" />
          <Link href="/login" className="text-primary text-sm underline">
            {t("DOCS.SETUP.LOGIN_REQUIRED")}
          </Link>
        </div>
      )}

      {token.isLoggedIn && token.needsToken && (
        <div className="border-border bg-card flex items-center gap-2 rounded-lg border px-4 py-3">
          <LuKey className="text-muted-foreground size-3.5 shrink-0" />
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
              <LuLoader className="size-3 animate-spin" />
            ) : (
              <LuPlus className="size-3" />
            )}
            {t("DOCS.GENERATE_API_KEY")}
          </Button>
        </div>
      )}

      {/* App buttons */}
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
                <LuLoader className="size-4 animate-spin" />
              ) : (
                <LuExternalLink className="size-4" />
              )}
              {app.label}
            </Button>
          </a>
        ))}
      </div>

      {/* Not installed banner */}
      {showInstall && (
        <div
          ref={installRef}
          className="border-border bg-card animate-in fade-in slide-in-from-top-2 flex items-center gap-3 rounded-lg border px-4 py-3"
        >
          <LuCircleAlert className="text-muted-foreground size-4 shrink-0" />
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
                href={{ pathname: "/docs/cc-switch", hash: "installation" }}
              />
            }
          >
            <LuDownload className="size-3" />
            {t("DOCS.SETUP.INSTALL_LINK")}
          </Button>
        </div>
      )}

      {/* CLI Alternative */}
      <div>
        <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-sm font-medium">
          <LuTerminal className="size-3.5" />
          {t("DOCS.CC_SWITCH.CLI_ALTERNATIVE")}
        </p>
        {props.cliCodeBlock}
      </div>
    </div>
  );
}
