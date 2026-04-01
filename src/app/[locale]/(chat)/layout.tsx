import { ChatSidebarLayout } from "@/components/layout/chat-sidebar-layout";
import { DOCS_TOKEN_PARAMS } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

export default async function ChatLayout(props: Props) {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => handleElysia(await rpc.api.pricing.get()),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.conversations(),
      queryFn: async () => handleElysia(await rpc.api.chat.get(cookieHeaders)),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.tokens(DOCS_TOKEN_PARAMS),
      queryFn: async () =>
        handleElysia(
          await rpc.api.token.search.get({
            query: DOCS_TOKEN_PARAMS,
            ...cookieHeaders,
          }),
        ),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatSidebarLayout>{props.children}</ChatSidebarLayout>
    </HydrationBoundary>
  );
}
