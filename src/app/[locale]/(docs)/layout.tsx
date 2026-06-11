import { prefetchElysia } from "@/lib/react-query/prefetch";
import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default async function DocsLayout(props: DocsLayoutProps) {
  const queryClient = getQueryClient();

  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );

  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  if (isLoggedIn) {
    await prefetchElysia(queryClient, queryKeys.bestKey(), (cookies) =>
      rpc.api.billing.token["best-key"].get({
        ...cookies,
      }),
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarLayout navConfig="docs" showSearch>
        {props.children}
      </SidebarLayout>
    </HydrationBoundary>
  );
}
