"use client";

import dynamic from "next/dynamic";

export const TypographicSmokeLazy = dynamic(
  () => import("./typographic-smoke").then((m) => m.TypographicSmoke),
  { ssr: false },
);
