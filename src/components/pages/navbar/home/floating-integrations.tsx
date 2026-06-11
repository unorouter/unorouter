"use client";

import dynamic from "next/dynamic";

// Lazy: motion/react ~30kb gz, decorative chips at lg+ only. ssr:false avoids
// hydration mismatch from motion transform init; pure decoration, no SEO loss.
const FloatingIntegrationsMotion = dynamic(
  () =>
    import("@/components/pages/navbar/home/floating-integrations-motion").then(
      (m) => m.FloatingIntegrationsMotion,
    ),
  { ssr: false },
);

// Titles arrive pre-translated from the server parent (HeroSection) so the
// client message bundle never needs the DOCS namespace.
export function FloatingIntegrations(props: {
  titles: Record<string, string>;
}) {
  return <FloatingIntegrationsMotion titles={props.titles} />;
}
