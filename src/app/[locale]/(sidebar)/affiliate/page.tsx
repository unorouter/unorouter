import { Affiliate } from "@/components/pages/sidebar/affiliate/affiliate";
import { DEFAULT_PAGE_PARAMS } from "@/lib/config/constants";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export default async function AffiliatePage() {
  const queryClient = getQueryClient();
  const cookieHeaders = await setCookies();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.affiliateInvitees(DEFAULT_PAGE_PARAMS),
      queryFn: async () =>
        handleElysia(
          await rpc.api.affiliate.invitees.get({
            ...cookieHeaders,
            query: DEFAULT_PAGE_PARAMS,
          }),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.affiliateCommissions(DEFAULT_PAGE_PARAMS),
      queryFn: async () =>
        handleElysia(
          await rpc.api.affiliate.commissions.get({
            ...cookieHeaders,
            query: DEFAULT_PAGE_PARAMS,
          }),
        ),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Affiliate />
    </HydrationBoundary>
  );
}
