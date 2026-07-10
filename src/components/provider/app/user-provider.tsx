import { dehydrateOnly, prefetchElysia } from "@/lib/react-query/prefetch";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { HydrationBoundary } from "@tanstack/react-query";
import { ReactNode } from "react";

export async function UserProvider(props: { children: ReactNode }) {
  const queryClient = getQueryClient();

  await prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
    rpc.api.auth.account.self.get(cookies),
  );

  return (
    <HydrationBoundary state={dehydrateOnly(queryClient, [queryKeys.auth()])}>
      {props.children}
    </HydrationBoundary>
  );
}
