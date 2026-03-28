import { AffiliatePage } from "@/components/pages/sidebar/affiliate/affiliate-page";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

const DEFAULT_PAGE = { p: 1, page_size: 10 };

export default async function AffiliatePageRoute() {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.auth(),
      queryFn: async () =>
        handleElysia(await rpc.api.auth.self.get(cookieHeaders)),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.affiliateInvitees(DEFAULT_PAGE),
      queryFn: async () =>
        handleElysia(
          await rpc.api.affiliate.invitees.get({
            ...cookieHeaders,
            query: DEFAULT_PAGE,
          }),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.affiliateCommissions(DEFAULT_PAGE),
      queryFn: async () =>
        handleElysia(
          await rpc.api.affiliate.commissions.get({
            ...cookieHeaders,
            query: DEFAULT_PAGE,
          }),
        ),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AffiliatePage />
    </HydrationBoundary>
  );
}
