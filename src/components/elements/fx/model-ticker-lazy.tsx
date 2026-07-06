"use client";

import dynamic from "next/dynamic";

export const ModelTickerLazy = dynamic(
  () => import("./model-ticker").then((m) => m.ModelTicker),
  { ssr: false },
);
