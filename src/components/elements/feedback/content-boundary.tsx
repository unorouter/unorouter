"use client";

import { ErrorFallback } from "@/components/elements/feedback/error-fallback";
import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import type { PropsWithChildren } from "react";

    // Error boundary for a layout's content slot: a page crash renders the fallback in place while chrome stays mounted.
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
