import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

export async function AppPrefetchProvider(props: Props) {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () =>
      handleElysia(await rpc.api.auth.self.get(cookieHeaders!)),
  });
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  await Promise.all([
    isLoggedIn &&
      queryClient.prefetchQuery({
        queryKey: queryKeys.subscriptionSelf(),
        queryFn: async () =>
          handleElysia(
            await rpc.api.billing["subscription-self"].get(cookieHeaders!),
          ),
      }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}
