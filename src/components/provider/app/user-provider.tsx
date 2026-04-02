import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { setIsLoggedIn } from "@/store/auth-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { ReactNode } from "react";

export async function UserProvider(props: { children: ReactNode }) {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: queryKeys.auth(),
    queryFn: async () =>
      handleElysia(await rpc.api.auth.self.get(await setCookies())),
  });

  setIsLoggedIn(!!queryClient.getQueryData(queryKeys.auth()));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}
