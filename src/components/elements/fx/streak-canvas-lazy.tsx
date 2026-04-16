"use client";

import dynamic from "next/dynamic";

export const StreakCanvasLazy = dynamic(
  () => import("./streak-canvas").then((m) => m.StreakCanvas),
  { ssr: false },
);
