"use client";

import dynamic from "next/dynamic";

const FloatingIntegrationsMotion = dynamic(
  () =>
    import("@/components/pages/navbar/home/floating-integrations-motion").then(
      (m) => m.FloatingIntegrationsMotion,
    ),
  { ssr: false },
);

export function FloatingIntegrations(props: {
  titles: Record<string, string>;
}) {
  return <FloatingIntegrationsMotion titles={props.titles} />;
}
