"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { posthog } from "@/lib/posthog-lazy";
import { clearAllClientStorage, formatError } from "@/lib/utils/recovery";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";

// Shape Next.js passes to an `error.tsx` boundary component.
export type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

type ErrorFallbackProps = {
  error: Error & { digest?: string };
  reset?: () => void;
  homePath?: string;
  fullScreen?: boolean;
};

export function ErrorFallback(props: ErrorFallbackProps) {
  const t = useTranslations();
  const [clearing, setClearing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(props.error);
    posthog.captureException(props.error);
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
      className={`flex items-center justify-center p-4 ${props.fullScreen ? "bg-background min-h-screen" : "flex-1"}`}
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

          <details className="text-left">
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
