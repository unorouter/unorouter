import { ModelTickerLazy } from "@/components/elements/fx/model-ticker-lazy";
import { StreakCanvasLazy } from "@/components/elements/fx/streak-canvas-lazy";
import React from "react";
import { CodeSection } from "./code-section";
import { CtaSection } from "./cta-section";
import { HeroSection } from "./hero-section";
import type { HeroCounts } from "./hero-stats-grid";
import { IntegrationBanner } from "./integration-banner";
import { PricingSection } from "./pricing-section";
import { ReliabilitySection } from "./reliability-section";

export const Home: React.FC<{ counts: HeroCounts }> = (props) => {
  return (
    <>
      <StreakCanvasLazy />
      <HeroSection counts={props.counts} />
      <IntegrationBanner />
      <ModelTickerLazy />
      <PricingSection />
      <ReliabilitySection />
      <CodeSection />
      <CtaSection />
    </>
  );
};
