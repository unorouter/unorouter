import { ModelTicker } from "@/components/elements/model-ticker";
import { StreakCanvas } from "@/components/elements/streak-canvas";
import { CodeSection } from "@/components/pages/home/code-section";
import { CtaSection } from "@/components/pages/home/cta-section";
import { HeroSection } from "@/components/pages/home/hero-section";
import { IntegrationBanner } from "@/components/pages/home/integration-banner";
import { PricingSection } from "@/components/pages/home/pricing-section";
import { ReliabilitySection } from "@/components/pages/home/reliability-section";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

export default async function HomePage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.newApi.pricing(),
      queryFn: async () => handleElysia(await rpc.api.pricing.get()),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.stats.tokens(),
      queryFn: async () => handleElysia(await rpc.api.stats.tokens.get()),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-screen bg-[#050505]">
        <StreakCanvas />
        <HeroSection />
        <IntegrationBanner />
        <ModelTicker />
        <PricingSection />
        <ReliabilitySection />
        <CodeSection />
        <CtaSection />
      </div>
    </HydrationBoundary>
  );
}
