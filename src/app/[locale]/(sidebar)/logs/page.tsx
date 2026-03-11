import { UsageLogs } from "@/components/pages/sidebar/logs/usage-logs";
import { DataTableProvider } from "@/components/provider/data-table-provider";
import { loadDataFromCookie } from "@/lib/config/table-storage";
import { StoreId } from "@/lib/types/enums";
import type { DataTableStores } from "@/store/data-table-store";
import { cookies } from "next/headers";

export default async function LogsPage() {
  const cookie = await cookies();

  const tableStores = loadDataFromCookie<DataTableStores>(
    StoreId.DATA_TABLES_STORE,
    cookie,
  );

  return (
    <DataTableProvider data={tableStores}>
      <UsageLogs />
    </DataTableProvider>
  );
}
