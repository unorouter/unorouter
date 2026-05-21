"use client";

import {
  ErrorFallback,
  type RouteErrorProps,
} from "@/components/elements/feedback/error-fallback";

export default function SidebarError(props: RouteErrorProps) {
  return (
    <ErrorFallback
      error={props.error}
      reset={props.reset}
      homePath="/dashboard"
    />
  );
}
