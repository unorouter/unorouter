import { Chat } from "@/components/pages/chat/chat";
import { PAGE_SIZE } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { getIsLoggedIn } from "@/store/auth-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  params: Promise<{ convId: string }>;
};

export default async function ChatConvPage(props: Props) {
  const { convId } = await props.params;
  const queryClient = getQueryClient();
  const isLoggedIn = getIsLoggedIn();

  if (isLoggedIn) {
    const cookieHeaders = await setCookies();
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.conversation(convId),
        queryFn: async () =>
          handleElysia(
            await rpc.api.chat({ id: convId }).meta.get(cookieHeaders),
          ),
      }),
      queryClient.prefetchInfiniteQuery({
        queryKey: queryKeys.conversationMessages(convId),
        queryFn: async ({ pageParam }) =>
          handleElysia(
            await rpc.api
              .chat({ id: convId })
              .get({ query: { p: pageParam, page_size: PAGE_SIZE }, ...cookieHeaders }),
          ),
        initialPageParam: 1,
      }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Chat initialConvId={convId} />
    </HydrationBoundary>
  );
}
