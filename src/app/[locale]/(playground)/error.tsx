"use client";

import {
  ErrorFallback,
  type RouteErrorProps,
} from "@/components/elements/feedback/error-fallback";

export default function PlaygroundError(props: RouteErrorProps) {
  return (
    <ErrorFallback
      error={props.error}
      reset={props.reset}
      homePath="/playground"
    />
  );
}
