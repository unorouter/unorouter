"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const FloatingIntegrationsMotion = dynamic(
  () =>
    import("@/components/pages/navbar/home/floating-integrations-motion").then(
      (m) => m.FloatingIntegrationsMotion,
    ),
  { ssr: false },
);

// ssr:false defers the chunk to the client, so it needs a boundary to suspend
// against while that chunk loads.
export function FloatingIntegrations(props: {
  titles: Record<string, string>;
}) {
  return (
    <Suspense fallback={null}>
      <FloatingIntegrationsMotion titles={props.titles} />
    </Suspense>
  );
}
