"use client";

import dynamic from "next/dynamic";

// Decorative marquee with polling hooks; keep it off the hydration critical path.
export const ModelTickerLazy = dynamic(
  () => import("./model-ticker").then((m) => m.ModelTicker),
  { ssr: false },
);
