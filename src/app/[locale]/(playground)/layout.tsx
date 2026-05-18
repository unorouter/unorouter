import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { GuestLocalDbMigrate } from "@/components/pages/sidebar/chat/runtime/guest-local-db-migrate";
import { PlaygroundList } from "@/components/pages/sidebar/playground/history/playground-list";
import { SyncStateHydrator } from "@/lib/db/client/sync-state-hydrator";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function GenerateGroupLayout(props: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.pricing(),
    queryFn: async () => handleElysia(await rpc.api.pricing.get()),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SyncStateHydrator />
      <GuestLocalDbMigrate />
      <SidebarLayout
        before={<AuthRedirectCleanup />}
        navConfig="generate"
        chatContent={<PlaygroundList />}
      >
        {props.children}
      </SidebarLayout>
    </HydrationBoundary>
  );
}
