"use client";

import { ErrorFallback } from "@/components/elements/feedback/error-fallback";

type Props = {
  error: Error & { digest?: string };
  reset(): void;
};

export default function ChatError(props: Props) {
  return (
    <ErrorFallback error={props.error} reset={props.reset} homePath="/chat" />
  );
}
