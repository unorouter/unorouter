"use client";

import { ErrorFallback } from "@/components/elements/feedback/error-fallback";
import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import type { PropsWithChildren } from "react";

    // Error boundary scoped to a layout's content slot: a page crash renders the fallback in place while chrome stays mounted. className lets a layout offset it past a fixed navbar.
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
