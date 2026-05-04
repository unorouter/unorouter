"use client";

import dynamic from "next/dynamic";

// Lazy-load the motion-driven implementation. `motion/react` is ~30kb gz
// and only needed for these decorative chips at the lg+ breakpoint, so
// keeping it out of the initial bundle wins more than it costs.
//
// `ssr: false` is fine: the chips are pure decoration (the StatsPanel
// underneath them carries the real content), and skipping SSR avoids
// hydration mismatch from the motion runtime initializing transforms.
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
