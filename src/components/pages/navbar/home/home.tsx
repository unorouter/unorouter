import { ModelTicker } from "@/components/elements/fx/model-ticker";
import dynamic from "next/dynamic";
import React from "react";

const StreakCanvas = dynamic(
  () => import("@/components/elements/fx/streak-canvas").then((m) => m.StreakCanvas),
  { ssr: false },
);
import { CodeSection } from "./code-section";
import { CtaSection } from "./cta-section";
import { HeroSection } from "./hero-section";
import { IntegrationBanner } from "./integration-banner";
import { PricingSection } from "./pricing-section";
import { ReliabilitySection } from "./reliability-section";

export const Home: React.FC = () => {
  return (
    <>
      <StreakCanvas />
      <HeroSection />
      <IntegrationBanner />
      <ModelTicker />
      <PricingSection />
      <ReliabilitySection />
      <CodeSection />
      <CtaSection />
    </>
  );
};
