import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { PlaygroundList } from "@/components/pages/sidebar/playground/history/playground-list";
import { AuthRedirectCleanup } from "@/components/provider/app/auth-redirect-cleanup";
import { SyncStateHydrator } from "@/lib/db/client/sync/sync-state-hydrator";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function GenerateGroupLayout(props: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  await Promise.all([
    isLoggedIn &&
      queryClient.prefetchQuery({
        queryKey: queryKeys.syncState(),
        queryFn: async () =>
          handleElysia(await rpc.api.ai.sync.state.get(cookieHeaders!)),
      }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SyncStateHydrator />
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
