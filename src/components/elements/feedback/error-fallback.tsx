"use client";

import { logChatDebug } from "@/lib/utils/chat-debug-log";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/config/env";
import { useTranslations } from "next-intl";
import { posthog } from "@/lib/posthog-lazy";
import { cn } from "@/lib/utils";
import {
  clearAllClientStorage,
  clearServiceWorkerCaches,
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
  const [clearingCaches, setClearingCaches] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(props.error);
    posthog.captureException(props.error);
    // The sessionStorage guard stops an infinite reload loop when the chunk is truly gone.
    if (isChunkLoadError(props.error)) {
      const KEY = "chunk-reload-once";
      logChatDebug("chunk.load_error", {
        message: String(props.error?.message ?? "").slice(0, 200),
        willReload: !sessionStorage.getItem(KEY),
      });
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, "1");
        // Caches AND the worker must go before the reload. Deleting caches
        // alone left a wedged worker serving the reload the same way, and the
        // once-guard then landed the user here with a destructive reset as
        // the most visible button.
        void clearServiceWorkerCaches()
          .catch(() => {})
          .then(() => window.location.reload());
      }
    }
  }, [props.error]);

  const details = formatError(props.error);
  const chunkError = isChunkLoadError(props.error);

  const resetData = async () => {
    setClearing(true);
    await clearAllClientStorage();
    window.location.reload();
  };

  const resetCaches = async () => {
    setClearingCaches(true);
    await clearServiceWorkerCaches();
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
            {chunkError
              ? t("MAIN.ERROR.RESET_APP_CACHE_HINT")
              : t("MAIN.ERROR.UNEXPECTED_ERROR_OCCURRED")}
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

          <div className="space-y-1">
            <Button
              variant={chunkError ? "default" : "outline"}
              size={chunkError ? "default" : "sm"}
              disabled={clearingCaches}
              onClick={resetCaches}
              className="w-full"
            >
              {clearingCaches
                ? t("MAIN.ERROR.RESETTING")
                : t("MAIN.ERROR.RESET_APP_CACHE")}
            </Button>
            <p className="text-muted-foreground text-xs">
              {t("MAIN.ERROR.RESET_APP_CACHE_HINT")}
            </p>
          </div>

          {!chunkError && (
            <div className="space-y-1">
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
              <p className="text-muted-foreground text-xs">
                {t("MAIN.ERROR.RESET_APP_DATA_HINT")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
