"use client";

import dynamic from "next/dynamic";
import { Suspense, type ComponentProps } from "react";

const TypographicSmoke = dynamic(
  () => import("./typographic-smoke").then((m) => m.TypographicSmoke),
  { ssr: false },
);

// ssr:false is a CSR bailout: without its own Suspense boundary it ejects the
// whole page from the PPR static shell.
export function TypographicSmokeLazy(
  props: ComponentProps<typeof TypographicSmoke>,
) {
  return (
    <Suspense fallback={null}>
      <TypographicSmoke {...props} />
    </Suspense>
  );
}
