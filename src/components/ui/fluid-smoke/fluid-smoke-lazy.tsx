"use client";

import dynamic from "next/dynamic";

export const FluidSmokeLazy = dynamic(
  () => import("./fluid-smoke").then((m) => m.FluidSmoke),
  { ssr: false },
);
