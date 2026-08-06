"use client";

import dynamic from "next/dynamic";
import { Suspense, type ComponentProps } from "react";

const StreakCanvas = dynamic(
  () => import("./streak-canvas").then((m) => m.StreakCanvas),
  { ssr: false },
);

// ssr:false is a CSR bailout: without its own Suspense boundary it ejects the
// whole page from the PPR static shell.
export function StreakCanvasLazy(props: ComponentProps<typeof StreakCanvas>) {
  return (
    <Suspense fallback={null}>
      <StreakCanvas {...props} />
    </Suspense>
  );
}
