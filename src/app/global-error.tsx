"use client";

import type { RouteErrorProps } from "@/components/elements/feedback/error-fallback";
import { posthog } from "@/lib/posthog-lazy";
import { useEffect } from "react";

export default function GlobalError(props: RouteErrorProps) {
  useEffect(() => {
    posthog.captureException(props.error);
  }, [props.error]);

  return (
    <html>
      <body className="bg-background text-foreground flex min-h-screen items-center justify-center font-sans">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold">Something went wrong</h2>
          <button
            onClick={props.reset}
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
