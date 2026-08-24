"use client";

import dynamic from "next/dynamic";
import { type ComponentProps } from "react";

const StreakCanvas = dynamic(
  () => import("./streak-canvas").then((m) => m.StreakCanvas),
  { ssr: false },
);

export function StreakCanvasLazy(props: ComponentProps<typeof StreakCanvas>) {
  return <StreakCanvas {...props} />;
}
