"use client";

import { ErrorFallback } from "@/components/elements/feedback/error-fallback";
import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import type { PropsWithChildren } from "react";

export function ContentBoundary(
  props: PropsWithChildren<{ className?: string }>,
) {
  return (
    <SectionBoundary
      fallback={(fb) => (
        <ErrorFallback
          error={fb.error}
          reset={fb.reset}
          className={props.className}
        />
      )}
    >
      {props.children}
    </SectionBoundary>
  );
}
