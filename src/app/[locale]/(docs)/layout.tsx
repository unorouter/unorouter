import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export default async function DocsLayout(props: DocsLayoutProps) {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () =>
      handleElysia(await rpc.api.auth.account.self.get(cookieHeaders!)),
  });

  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  if (isLoggedIn) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.bestKey(),
      queryFn: async () =>
        handleElysia(
          await rpc.api.billing.token["best-key"].get({
            ...cookieHeaders,
          }),
        ),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarLayout navConfig="docs" showSearch>
        {props.children}
      </SidebarLayout>
    </HydrationBoundary>
  );
}
