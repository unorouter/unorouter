import { SidebarLayout } from "@/components/layout/sidebar/sidebar-layout";
import { DOCS_TOKEN_PARAMS } from "@/lib/config/constants";
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
    queryKey: queryKeys.tokens(DOCS_TOKEN_PARAMS),
    queryFn: async () =>
      handleElysia(
        await rpc.api.token.search.get({
          query: DOCS_TOKEN_PARAMS,
          ...cookieHeaders,
        }),
      ),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SidebarLayout navConfig="docs" showSearch>
        {props.children}
      </SidebarLayout>
    </HydrationBoundary>
  );
}
