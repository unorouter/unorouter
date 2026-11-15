"use client";

import dynamic from "next/dynamic";

// A client module of its own: server components may not use ssr:false.
export const FloatingIntegrations = dynamic(
  () =>
    import("@/components/pages/navbar/home/floating-integrations-motion").then(
      (m) => m.FloatingIntegrationsMotion,
    ),
  { ssr: false },
);
