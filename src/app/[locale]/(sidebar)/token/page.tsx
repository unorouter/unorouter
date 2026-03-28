import { TokenList } from "@/components/pages/sidebar/tokens/token-list";
import { DataTableProvider } from "@/components/provider/data-table-provider";
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
import type { DataTableStores } from "@/store/data-table-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

export default async function TokensPage() {
  const queryClient = getQueryClient();
  const cookie = await cookies();
  const cookieHeaders = await setCookies();

  const tableStores = loadDataFromCookie<DataTableStores>(
    StoreId.DATA_TABLES_STORE,
    cookie,
  );

  const tokensTable = tableStores?.[DataTableId.TOKENS] || initialTableStore();

  const p = (tokensTable.pagination?.pageIndex ?? 0) + 1;
  const keyword = tokensTable?.globalFilter || undefined;

  console.log("[TokensPage] tableStores:", queryKeys.tokens({ p, keyword }));

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.auth(),
      queryFn: async () =>
        handleElysia(await rpc.api.auth.self.get(cookieHeaders)),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.tokens({ p, keyword }),
      queryFn: async () =>
        handleElysia(
          await rpc.api.token.search.get({
            query: { p, keyword },
            ...cookieHeaders,
          }),
        ),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DataTableProvider data={tableStores}>
        <TokenList />
      </DataTableProvider>
    </HydrationBoundary>
  );
}
