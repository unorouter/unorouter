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

// ssr:false is a CSR bailout: without its own Suspense boundary it ejects the
// whole page from the PPR static shell.
export function FloatingIntegrations(props: {
  titles: Record<string, string>;
}) {
  return (
    <Suspense fallback={null}>
      <FloatingIntegrationsMotion titles={props.titles} />
    </Suspense>
  );
}
