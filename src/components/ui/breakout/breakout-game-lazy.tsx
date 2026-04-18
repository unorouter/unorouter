"use client";

import dynamic from "next/dynamic";

export const BreakoutGameLazy = dynamic(
  () => import("./breakout-game").then((m) => m.BreakoutGame),
  { ssr: false },
);
