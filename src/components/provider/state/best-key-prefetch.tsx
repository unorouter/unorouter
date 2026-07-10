import { dehydrateOnly, prefetchElysia } from "@/lib/react-query/prefetch";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { HydrationBoundary } from "@tanstack/react-query";

// Rendered childless inside a Suspense hole: streams the best-key hydration
// state for logged-in users without blocking the surrounding shell.
export async function BestKeyPrefetch() {
  const queryClient = getQueryClient();

  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );
  if (!queryClient.getQueryData(queryKeys.auth())) return null;

  await prefetchElysia(queryClient, queryKeys.bestKey(), (cookies) =>
    rpc.api.billing.token["best-key"].get({ ...cookies }),
  );

  return (
    <HydrationBoundary
      state={dehydrateOnly(queryClient, [queryKeys.bestKey()])}
    />
  );
}
