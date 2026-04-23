import { ModelTicker } from "@/components/elements/fx/model-ticker";
import { StreakCanvasLazy } from "@/components/elements/fx/streak-canvas-lazy";
import React from "react";
import { CodeSection } from "./code-section";
import { CtaSection } from "./cta-section";
import { HeroSection } from "./hero-section";
import {
  IntegrationBannerCli,
  IntegrationBannerRoleplay,
} from "./integration-banner";
import { PricingSection } from "./pricing-section";
import { ReliabilitySection } from "./reliability-section";

export const Home: React.FC = () => {
  return (
    <>
      <StreakCanvasLazy />
      <HeroSection />
      <IntegrationBannerCli />
      <ModelTicker />
      <IntegrationBannerRoleplay />
      <PricingSection />
      <ReliabilitySection />
      <CodeSection />
      <CtaSection />
    </>
  );
};
