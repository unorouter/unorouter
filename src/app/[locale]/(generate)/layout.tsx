import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { GenerationList } from "@/components/pages/sidebar/generate/generation-list";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

// Generate route group: mirrors the (chat) layout shape with a sidebar rail
// (GenerationList) in place of the conversation list. Lives outside
// (sidebar) so the rail can occupy the slot below the nav, like chat does.
//
// Public: anonymous visitors can browse the studio + try free image models.
// Paid models will hit upstream auth at submit time and surface as a clean
// failure on the row (caught in submitGeneration's try/catch).
export default async function GenerateGroupLayout(props: {
  children: React.ReactNode;
}) {
  // Prefetch pricing so the generate form can synthesize image-model
  // descriptors from /api/pricing.metadata.maxImageInputs on first paint.
  // Matches the (chat) and (status) layouts' pattern; the client hook stays
  // enabled:false so we don't trigger a duplicate fetch.
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.pricing(),
    queryFn: async () => handleElysia(await rpc.api.pricing.get()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarLayout
        before={<AuthRedirectCleanup />}
        navConfig="generate"
        chatContent={<GenerationList />}
      >
        {props.children}
      </SidebarLayout>
    </HydrationBoundary>
  );
}

