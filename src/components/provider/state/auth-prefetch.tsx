import { dehydrateOnly, prefetchElysia } from "@/lib/react-query/prefetch";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { HydrationBoundary } from "@tanstack/react-query";

// Rendered childless inside a Suspense hole: streams the auth (+subscription)
// hydration state without blocking the surrounding shell on the cookie read.
export async function AuthPrefetch() {
  const queryClient = getQueryClient();

  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );

  if (queryClient.getQueryData(queryKeys.auth())) {
    await prefetchElysia(queryClient, queryKeys.subscriptionSelf(), (cookies) =>
      rpc.api.billing.core["subscription-self"].get(cookies),
    );
  }

  return (
    <HydrationBoundary
      state={dehydrateOnly(queryClient, [
        queryKeys.auth(),
        queryKeys.subscriptionSelf(),
      ])}
    />
  );
}
