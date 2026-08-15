import { TokenList } from "@/components/pages/sidebar/tokens/token-list";
import { DataTableProvider } from "@/components/provider/state/data-table-provider";
import {
  initialTableStore,
  loadDataFromCookie,
} from "@/lib/config/table-storage";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { DataTableId, StoreId } from "@/lib/types/enums";
import type { DataTableStores } from "@/store/data-table-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

export default async function TokensPage() {
  const queryClient = getQueryClient();
  const cookie = await cookies();

  const tableStores = loadDataFromCookie<DataTableStores>(
    StoreId.DATA_TABLES_STORE,
    cookie,
  );

  const tokensTable = tableStores?.[DataTableId.TOKENS] || initialTableStore();

  const p = (tokensTable.pagination?.pageIndex ?? 0) + 1;
  const keyword = tokensTable?.globalFilter || undefined;

  await Promise.all([
    prefetchElysia(queryClient, queryKeys.auth(), (cookies) =>
      rpc.api.auth.account.self.get(cookies),
    ),
    prefetchElysia(queryClient, queryKeys.tokens({ p, keyword }), (cookies) =>
      rpc.api.billing.token.search.get({
        query: { p, keyword },
        ...cookies,
      }),
    ),
    prefetchElysia(queryClient, queryKeys.userGroups(), (cookies) =>
      rpc.api.billing.token.groups.get(cookies),
    ),
    prefetchElysia(queryClient, queryKeys.pricingVendors(), () =>
      rpc.api.models.pricing.vendors.get(),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DataTableProvider data={tableStores}>
        <TokenList />
      </DataTableProvider>
    </HydrationBoundary>
  );
}
