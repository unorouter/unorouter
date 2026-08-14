import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Wraps a Suspense hole's content with server-prefetched auth state (and
// optionally the best key). Content and hydration state travel in the same
// streamed chunk, so consumers below never race the cache.
export async function AuthHydration(props: {
  children: ReactNode;
  withBestKey?: boolean;
}) {
  const queryClient = getQueryClient();

  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );
  const isLoggedIn = !!queryClient.getQueryData(queryKeys.auth());

  if (isLoggedIn) {
    await Promise.all([
      prefetchElysia(queryClient, queryKeys.subscriptionSelf(), (cookies) =>
        rpc.api.billing.core["subscription-self"].get(cookies),
      ),
      props.withBestKey
        ? prefetchElysia(queryClient, queryKeys.bestKey(), (cookies) =>
            rpc.api.billing.token["best-key"].get({ ...cookies }),
          )
        : null,
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}
