"use client";

import dynamic from "next/dynamic";

// Decorative marquee with polling hooks; keep it out of the hydration
// critical path (same pattern as StreakCanvasLazy).
export const ModelTickerLazy = dynamic(
  () => import("./model-ticker").then((m) => m.ModelTicker),
  { ssr: false },
);
