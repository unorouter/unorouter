import { ChatPage } from "@/components/pages/chat/chat-page";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { getCookieValue, setCookies } from "@/lib/utils/server";
import { CLIENT_STORE_KEY, type ClientState } from "@/store/client-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function ChatPageRoute() {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();
  const clientStore = await getCookieValue<ClientState>(CLIENT_STORE_KEY);
  const selectedConvId = clientStore?.selectedConversation;

  if (selectedConvId) {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.conversation(selectedConvId),
      queryFn: async () =>
        handleElysia(
          await rpc.api.chat({ id: selectedConvId }).get(cookieHeaders),
        ),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChatPage />
    </HydrationBoundary>
  );
}
