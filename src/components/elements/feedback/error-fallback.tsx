"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/config/env";
import { useTranslations } from "next-intl";
import { posthog } from "@/lib/posthog-lazy";
import { cn } from "@/lib/utils";
import {
  clearAllClientStorage,
  formatError,
  isChunkLoadError,
} from "@/lib/utils/recovery";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";

export type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  homePath?: string;
  fullScreen?: boolean;
  className?: string;
};

export function ErrorFallback(props: ErrorFallbackProps) {
  const t = useTranslations();
  const [clearing, setClearing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(props.error);
    posthog.captureException(props.error);
    // Chunk load failures after a deploy mean this tab holds stale HTML pointing at chunks the new
    // build replaced. Hard-reload once (fetching fresh HTML) instead of showing an error page; the
    // sessionStorage guard prevents a reload loop if the chunk is genuinely gone.
    if (isChunkLoadError(props.error)) {
      const KEY = "chunk-reload-once";
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        // A plain reload is served BY the service worker, so it hands back the very HTML
        // that asked for the missing chunk and the page fails identically. Drop the build
        // scoped caches and let the waiting worker take over, THEN reload.
        void (async () => {
          try {
            const names = await caches.keys();
            await Promise.all(
              names
                .filter((n) => n !== "fonts" && n !== "images")
                .map((n) => caches.delete(n)),
            );
            const regs = await navigator.serviceWorker
              ?.getRegistrations?.()
              .catch(() => []);
            await Promise.all((regs ?? []).map((r) => r.update()));
          } catch {
            // Cache APIs can be unavailable (private mode, older Safari); the reload below
            // is still worth attempting.
          }
          window.location.reload();
        })();
      }
    }
  }, [props.error]);

  const details = formatError(props.error);

  const resetData = async () => {
    setClearing(true);
    await clearAllClientStorage();
    window.location.reload();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center p-4",
        props.fullScreen ? "bg-background min-h-screen" : "flex-1",
        props.className,
      )}
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="bg-destructive/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <Icon name="triangle-alert" className="text-destructive h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-semibold">
            {t("MAIN.ERROR.SOMETHING_WENT_WRONG")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground text-sm">
            {t("MAIN.ERROR.UNEXPECTED_ERROR_OCCURRED")}
          </p>

          {env.discordUrl && (
            <a
              href={env.discordUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
            >
              <Icon name="brand-discord" className="h-3.5 w-3.5" />
              {t("MAIN.ERROR.DISCORD_HELP")}
            </a>
          )}

          <details className="text-left" open>
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium">
              {t("MAIN.ERROR.ERROR_DETAILS")}
            </summary>
            <pre className="bg-muted mt-2 max-h-64 overflow-auto rounded-md p-3 font-mono text-xs whitespace-pre-wrap">
              {details}
            </pre>
            <Button
              variant="outline"
              size="sm"
              onClick={copy}
              className="mt-2 flex items-center gap-2"
            >
              <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
              {copied ? t("COMMON.COPIED") : t("MAIN.ERROR.COPY_ERROR")}
            </Button>
          </details>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={() =>
                props.reset ? props.reset() : window.location.reload()
              }
              className="flex items-center gap-2"
            >
              <Icon name="refresh-cw" className="h-4 w-4" />
              {t("MAIN.ACTIONS.TRY_AGAIN")}
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = props.homePath ?? "/")}
              className="flex items-center gap-2"
            >
              {t("MAIN.ACTIONS.GO_HOME")}
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={clearing}
            onClick={resetData}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
          >
            {clearing
              ? t("MAIN.ERROR.RESETTING")
              : t("MAIN.ERROR.RESET_APP_DATA")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
