import { Chat } from "@/components/pages/chat/chat";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { getCookieValue, setCookies } from "@/lib/utils/server";
import { getIsLoggedIn } from "@/store/auth-store";
import { CLIENT_STORE_KEY, type ClientState } from "@/store/client-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function ChatPage() {
  const queryClient = getQueryClient();

  if (getIsLoggedIn()) {
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
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Chat />
    </HydrationBoundary>
  );
}
