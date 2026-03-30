import { SharedConversationView } from "@/components/pages/chat/shared-conversation-view";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ shareId: string }>;
};

export default async function SharedPage(props: Props) {
  const { shareId } = await props.params;
  const queryClient = getQueryClient();

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.sharedConversation(shareId),
      queryFn: async () =>
        handleElysia(await rpc.api.chat.shared({ shareId }).get()),
    });
  } catch {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SharedConversationView shareId={shareId} />
    </HydrationBoundary>
  );
}
