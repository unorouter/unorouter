"use client";

import {
  ErrorFallback,
  type RouteErrorProps,
} from "@/components/elements/feedback/error-fallback";

export default function Error(props: RouteErrorProps) {
  return <ErrorFallback error={props.error} reset={props.reset} fullScreen />;
}
