"use client";

import type { RouteErrorProps } from "@/components/elements/feedback/error-fallback";
import { env } from "@/lib/config/env";
import { posthog } from "@/lib/posthog-lazy";
import { clearAllClientStorage, formatError } from "@/lib/utils/recovery";
import { useEffect, useState } from "react";

export default function GlobalError(props: RouteErrorProps) {
  const [clearing, setClearing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error(props.error);
    posthog.captureException(props.error);
  }, [props.error]);

  const details = formatError(props.error);

  const reset = async () => {
    setClearing(true);
    await clearAllClientStorage();
    location.reload();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <html>
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center p-4 font-sans">
        <div className="w-full max-w-lg space-y-4 text-center">
          <h2 className="text-2xl font-bold">Something went wrong</h2>
          <p className="text-muted-foreground text-sm">
            An unexpected error occurred. If retrying does not help, reset the
            app data below to clear corrupt local state.
          </p>

          <details className="text-left" open>
            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-medium">
              Error details
            </summary>
            <pre className="bg-muted mt-2 max-h-64 overflow-auto rounded-md p-3 text-left font-mono text-xs whitespace-pre-wrap">
              {details}
            </pre>
            <button
              onClick={copy}
              className="border-border hover:bg-muted mt-2 rounded-md border px-3 py-1.5 text-xs transition-colors"
            >
              {copied ? "Copied" : "Copy error"}
            </button>
          </details>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              onClick={props.reset}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 transition-colors"
            >
              Try again
            </button>
            <button
              onClick={reset}
              disabled={clearing}
              className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-md border px-4 py-2 transition-colors disabled:opacity-50"
            >
              {clearing ? "Resetting..." : "Reset app data & reload"}
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="border-border hover:bg-muted rounded-md border px-4 py-2 transition-colors"
            >
              Go home
            </button>
            {env.discordUrl && (
              <a
                href={env.discordUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-border hover:bg-muted rounded-md border px-4 py-2 text-center transition-colors"
              >
                Get help on Discord
              </a>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
