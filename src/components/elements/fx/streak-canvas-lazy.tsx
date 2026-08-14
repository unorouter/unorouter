"use client";

import dynamic from "next/dynamic";
import { type ComponentProps } from "react";

const StreakCanvas = dynamic(
  () => import("./streak-canvas").then((m) => m.StreakCanvas),
  { ssr: false },
);

// ssr:false defers the chunk to the client, so it needs a boundary to suspend
// against while that chunk loads.
export function StreakCanvasLazy(props: ComponentProps<typeof StreakCanvas>) {
  return <StreakCanvas {...props} />;
}
