import { prefetchElysia } from "@/lib/react-query/prefetch";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

export async function AppPrefetchProvider(props: Props) {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await prefetchElysia(queryClient, queryKeys.auth(), () =>
    rpc.api.auth.account.self.get(cookieHeaders!),
  );
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  await Promise.all([
    isLoggedIn &&
      prefetchElysia(queryClient, queryKeys.subscriptionSelf(), () =>
        rpc.api.billing.core["subscription-self"].get(cookieHeaders!),
      ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}
