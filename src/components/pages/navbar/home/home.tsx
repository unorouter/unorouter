import { ModelTicker } from "@/components/elements/fx/model-ticker";
import { StreakCanvasLazy } from "@/components/elements/fx/streak-canvas-lazy";
import React from "react";
import { ChatSection } from "./chat-section";
import { CodeSection } from "./code-section";
import { CtaSection } from "./cta-section";
import { HeroSection } from "./hero-section";
import { IntegrationBanner } from "./integration-banner";
import { PricingSection } from "./pricing-section";

export const Home: React.FC = () => {
  return (
    <>
      <StreakCanvasLazy />
      <HeroSection />
      <IntegrationBanner />
      <ModelTicker />
      <PricingSection />
      <ChatSection />
      <CodeSection />
      <CtaSection />
    </>
  );
};
