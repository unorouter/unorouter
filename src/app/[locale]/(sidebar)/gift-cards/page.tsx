import { GiftCards } from "@/components/pages/sidebar/gift-cards/gift-cards";
import { DataTableProvider } from "@/components/provider/state/data-table-provider";
import {
  initialTableStore,
  loadDataFromCookie,
} from "@/lib/config/table-storage";
import getQueryClient from "@/lib/react-query/client";
import { queryKeys } from "@/lib/react-query/keys";
import { prefetchAuth, prefetchElysia } from "@/lib/react-query/prefetch";
import { rpc } from "@/lib/rpc";
import { DataTableId, StoreId } from "@/lib/types/enums";
import type { DataTableStores } from "@/store/data-table-store";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { cookies } from "next/headers";

export default async function GiftCardsPage() {
  const queryClient = getQueryClient();
  const cookie = await cookies();

  const tableStores = loadDataFromCookie<DataTableStores>(
    StoreId.DATA_TABLES_STORE,
    cookie,
  );
  const cardsTable =
    tableStores?.[DataTableId.PARTNER_GIFT_CARDS] || initialTableStore();

  const cardsParams = {
    p: (cardsTable.pagination?.pageIndex ?? 0) + 1,
    page_size: cardsTable.pagination?.pageSize ?? 10,
  };

  await Promise.all([
    prefetchAuth(queryClient),
    prefetchElysia(
      queryClient,
      queryKeys.partnerGiftCards(cardsParams),
      (cookies) =>
        rpc.api.billing.partner.redemption.get({
          ...cookies,
          query: cardsParams,
        }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DataTableProvider data={tableStores}>
        <GiftCards />
      </DataTableProvider>
    </HydrationBoundary>
  );
}
