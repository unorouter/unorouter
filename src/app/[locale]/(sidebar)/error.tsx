"use client";

import { ErrorFallback } from "@/components/elements/error-fallback";

type Props = {
  error: Error & { digest?: string };
  reset(): void;
};

export default function SidebarError(props: Props) {
  return (
    <ErrorFallback
      error={props.error}
      reset={props.reset}
      homePath="/dashboard"
    />
  );
}
