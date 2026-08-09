"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { Icon } from "@/components/ui/icon";
import { useAffiliateInviteesQuery } from "@/hooks/billing/affiliate-hook";
import { renderQuota } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import type { InvitedUser } from "@/openapi";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";

export function InviteesTab() {
  const t = useTranslations();
  const tableAtoms = createTableAtoms(DataTableId.AFFILIATE_INVITEES);
  const store = useAtomValue(tableAtoms.baseAtom);

  const inviteesQuery = useAffiliateInviteesQuery({
    p: store.pagination.pageIndex + 1,
    page_size: store.pagination.pageSize,
  });

  const responseData = inviteesQuery.data;
  const invitees = (responseData?.items ?? []).filter(Boolean);
  const total = responseData?.total ?? 0;

  const columns: ColumnDef<TableFeats, InvitedUser>[] = [
    {
      accessorKey: "username",
      header: t("AFFILIATE.TABLE.USER"),
      cell: ({ row }) => (
        <span className="text-foreground text-sm font-medium">
          {row.original?.display_name || row.original?.username || "-"}
        </span>
      ),
    },
    {
      accessorKey: "commission_count",
      header: t("AFFILIATE.TABLE.COMMISSIONS"),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {row.original?.commission_count}
        </span>
      ),
    },
    {
      accessorKey: "total_earned",
      header: t("AFFILIATE.TABLE.TOTAL_EARNED"),
      cell: ({ row }) => (
        <span
          className="font-mono text-sm font-medium tabular-nums"
          style={{ color: "var(--chart-2)" }}
        >
          {renderQuota(row.original?.total_earned)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("AFFILIATE.TABLE.STATUS"),
      cell: ({ row }) => (
        <span
          className="font-mono text-xs"
          style={{
            color:
              row.original?.status === 1
                ? "var(--chart-2)"
                : "var(--destructive)",
          }}
        >
          {row.original?.status === 1
            ? t("AFFILIATE.ENUM.ACTIVE")
            : t("AFFILIATE.ENUM.DISABLED")}
        </span>
      ),
    },
  ];

  return (
    <DataTable
      id={DataTableId.AFFILIATE_INVITEES}
      data={invitees}
      columns={columns}
      total={total}
      isLoading={inviteesQuery.isLoading}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <Icon name="users" className="text-muted-foreground h-6 w-6" />
          <span className="text-muted-foreground text-sm">
            {t("AFFILIATE.NO_INVITEES")}
          </span>
        </div>
      }
    />
  );
}
