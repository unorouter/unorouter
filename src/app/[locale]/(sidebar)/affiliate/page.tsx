import { Affiliate } from "@/components/pages/sidebar/affiliate/affiliate";
import {
  initialTableStore,
  loadDataFromCookie,
} from "@/lib/config/table-storage";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { rpc } from "@/lib/rpc";
import { DataTableId, StoreId } from "@/lib/types/enums";
import { handleElysia } from "@/lib/utils/base";
import { setCookies } from "@/lib/utils/server";
import { DataTableProvider } from "@/components/provider/state/data-table-provider";
import type { DataTableStores } from "@/store/data-table-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

export default async function AffiliatePage() {
  const queryClient = getQueryClient();
  const cookie = await cookies();
  const cookieHeaders = await setCookies();

  const tableStores = loadDataFromCookie<DataTableStores>(
    StoreId.DATA_TABLES_STORE,
    cookie,
  );

  const inviteesTable =
    tableStores?.[DataTableId.AFFILIATE_INVITEES] || initialTableStore();
  const commissionsTable =
    tableStores?.[DataTableId.AFFILIATE_COMMISSIONS] || initialTableStore();

  const inviteesParams = {
    p: (inviteesTable.pagination?.pageIndex ?? 0) + 1,
    page_size: inviteesTable.pagination?.pageSize ?? 10,
  };
  const commissionsParams = {
    p: (commissionsTable.pagination?.pageIndex ?? 0) + 1,
    page_size: commissionsTable.pagination?.pageSize ?? 10,
  };

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.affiliateInvitees(inviteesParams),
      queryFn: async () =>
        handleElysia(
          await rpc.api.billing.affiliate.invitees.get({
            ...cookieHeaders,
            query: inviteesParams,
          }),
        ),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.affiliateCommissions(commissionsParams),
      queryFn: async () =>
        handleElysia(
          await rpc.api.billing.affiliate.commissions.get({
            ...cookieHeaders,
            query: commissionsParams,
          }),
        ),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DataTableProvider data={tableStores}>
        <Affiliate />
      </DataTableProvider>
    </HydrationBoundary>
  );
}
