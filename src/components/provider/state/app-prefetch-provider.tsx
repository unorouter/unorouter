import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

type Props = {
  children: React.ReactNode;
};

/**
 * Server-side prefetch for data the navbar UserDropdown reads on every page.
 * Hydrates the React Query cache so the dropdown's badge / progress bar comes
 * from cache instead of firing two extra client-side requests on each
 * navigation. `subscription-self` is gated on auth (guests have no subs);
 * plans are public so we always prefetch them.
 */
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
    queryClient.prefetchQuery({
      queryKey: queryKeys.billingPlans(),
      queryFn: async () =>
        handleElysia(
          await rpc.api.billing["subscription-plans"].get(cookieHeaders!),
        ),
    }),
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
