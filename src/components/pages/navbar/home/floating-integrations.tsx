"use client";

import dynamic from "next/dynamic";

// Lazy decorative chips at lg+ only; ssr:false avoids motion transform hydration mismatch, pure decoration so no SEO loss.
const FloatingIntegrationsMotion = dynamic(
  () =>
    import("@/components/pages/navbar/home/floating-integrations-motion").then(
      (m) => m.FloatingIntegrationsMotion,
    ),
  { ssr: false },
);

// Titles arrive pre-translated from the server parent so the client bundle never needs the DOCS namespace.
export function FloatingIntegrations(props: {
  titles: Record<string, string>;
}) {
  return <FloatingIntegrationsMotion titles={props.titles} />;
}
