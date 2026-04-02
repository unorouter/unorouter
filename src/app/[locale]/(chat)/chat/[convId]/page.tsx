import { Chat } from "@/components/pages/chat/chat";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { getIsLoggedIn } from "@/store/auth-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ convId: string }>;
};

export default async function ChatConvPage(props: Props) {
  const { convId } = await props.params;
  const queryClient = getQueryClient();

  if (!getIsLoggedIn()) notFound();

  const cookieHeaders = await setCookies();

  try {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.conversation(convId),
      queryFn: async () =>
        handleElysia(
          await rpc.api.chat({ id: convId }).get(cookieHeaders),
        ),
    });
  } catch {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Chat initialConvId={convId} />
    </HydrationBoundary>
  );
}
