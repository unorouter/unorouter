"use client";

import dynamic from "next/dynamic";

// Lazy-loaded: motion/react ~30kb gz, only needed for decorative chips at lg+.
// ssr: false avoids hydration mismatch from motion transform init; chips are
// pure decoration so no SEO loss.
const FloatingIntegrationsMotion = dynamic(
  () =>
    import("@/components/pages/navbar/home/floating-integrations-motion").then(
      (m) => m.FloatingIntegrationsMotion,
    ),
  { ssr: false },
);

export function FloatingIntegrations() {
  return <FloatingIntegrationsMotion />;
}
