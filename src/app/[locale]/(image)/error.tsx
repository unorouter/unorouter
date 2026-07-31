"use client";

import {
  ErrorFallback,
  type RouteErrorProps,
} from "@/components/elements/feedback/error-fallback";

export default function ImageError(props: RouteErrorProps) {
  return (
    <ErrorFallback error={props.error} reset={props.reset} homePath="/image" />
  );
}
