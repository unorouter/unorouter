import { prefetchElysia } from "@/lib/react-query/prefetch";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

export async function AppPrefetchProvider(props: Props) {
  const queryClient = getQueryClient();

  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  await Promise.all([
    isLoggedIn &&
      prefetchElysia(queryClient, queryKeys.subscriptionSelf(), (cookies) =>
        rpc.api.billing.core["subscription-self"].get(cookies),
      ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}
