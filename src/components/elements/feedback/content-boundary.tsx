"use client";

import { ErrorFallback } from "@/components/elements/feedback/error-fallback";
import { SectionBoundary } from "@/components/elements/feedback/section-boundary";
import type { PropsWithChildren } from "react";

// Error boundary scoped to a layout's content slot only: a crash inside the
// page renders the fallback in place while the surrounding chrome (navbar,
// footer, sidebar, topbar) stays mounted and interactive. `className` lets a
// layout offset the fallback so a fixed navbar does not clip the card.
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
