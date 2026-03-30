import { ChatSidebarLayout } from "@/components/pages/chat/chat-sidebar-layout";
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
      queryKey: queryKeys.auth(),
      queryFn: async () =>
        handleElysia(await rpc.api.auth.self.get(cookieHeaders)),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.pricing(),
      queryFn: async () => handleElysia(await rpc.api.pricing.get()),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.conversations(),
      queryFn: async () =>
        handleElysia(await rpc.api.chat.get(cookieHeaders)),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatSidebarLayout>{props.children}</ChatSidebarLayout>
    </HydrationBoundary>
  );
}
