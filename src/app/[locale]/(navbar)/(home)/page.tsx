import { ModelTicker } from "@/components/elements/model-ticker";
import { StreakCanvas } from "@/components/elements/streak-canvas";
import { CodeSection } from "@/components/pages/home/code-section";
import { CtaSection } from "@/components/pages/home/cta-section";
import { HeroSection } from "@/components/pages/home/hero-section";
import { IntegrationBanner } from "@/components/pages/home/integration-banner";
import { PricingSection } from "@/components/pages/home/pricing-section";
import { ReliabilitySection } from "@/components/pages/home/reliability-section";
import { fetchPricing, processModels } from "@/lib/api/pricing";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";

export default async function HomePage() {
  let models: { name: string; vendor: string }[] = [];
  let modelCount = 0;
  let vendorCount = 0;

  const queryClient = getQueryClient();

  await Promise.all([
    (async () => {
      try {
        const pricing = await fetchPricing();
        const processed = processModels(pricing);
        models = processed.map((m) => ({ name: m.name, vendor: m.vendor.name }));
        modelCount = processed.length;
        vendorCount = new Set(pricing.vendors.map((v) => v.name)).size;
      } catch {
        modelCount = 200;
        vendorCount = 35;
      }
    })(),
    queryClient.prefetchQuery({
      queryKey: queryKeys.stats.tokens(),
      queryFn: async () => handleElysia(await rpc.api.stats.tokens.get()),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="min-h-screen bg-[#050505] text-white selection:bg-white selection:text-black overflow-x-hidden font-sans">
        <StreakCanvas />
        <HeroSection modelCount={modelCount} vendorCount={vendorCount} />
        <IntegrationBanner />
        {models.length > 0 && <ModelTicker models={models} />}
        <PricingSection />
        <ReliabilitySection />
        <CodeSection />
        <CtaSection />
      </div>
    </HydrationBoundary>
  );
}
