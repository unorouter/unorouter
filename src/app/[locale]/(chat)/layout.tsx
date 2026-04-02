import { ChatSidebarLayout } from "@/components/layout/chat-sidebar-layout";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { getIsLoggedIn } from "@/store/auth-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

export default async function ChatLayout(props: Props) {
  const queryClient = getQueryClient();
  const isLoggedIn = getIsLoggedIn();

  const cookieHeaders = isLoggedIn ? await setCookies() : undefined;

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => handleElysia(await rpc.api.pricing.get()),
    }),
    isLoggedIn &&
      queryClient.prefetchQuery({
        queryKey: queryKeys.conversations(),
        queryFn: async () =>
          handleElysia(await rpc.api.chat.get(cookieHeaders!)),
      }),
    isLoggedIn &&
      queryClient.prefetchQuery({
        queryKey: queryKeys.bestKey(),
        queryFn: async () =>
          handleElysia(
            await rpc.api.token["best-key"].get({
              ...cookieHeaders!,
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
