"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { useAffiliateInviteesQuery } from "@/hooks/affiliate-hook";
import { renderQuota } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { LuUsers } from "react-icons/lu";

type InviteeRow = {
  id: number;
  username: string;
  display_name: string;
  created_at: number;
  status: number;
  commission_count: number;
  total_earned: number;
};

function formatDate(timestamp: number): string {
  if (!timestamp || timestamp <= 0) return "";
  return dayjs.unix(timestamp).format("MMM D, YYYY");
}

export function InviteesTab() {
  const t = useTranslations();
  const tableAtoms = createTableAtoms(DataTableId.AFFILIATE_INVITEES);
  const store = useAtomValue(tableAtoms.baseAtom);

  const inviteesQuery = useAffiliateInviteesQuery({
    p: store.pagination.pageIndex + 1,
    page_size: store.pagination.pageSize,
  });

  const responseData = inviteesQuery.data as
    | { data?: { items?: InviteeRow[]; total?: number } }
    | undefined;

  const pageInfo = responseData?.data;
  const invitees: InviteeRow[] = pageInfo?.items ?? [];
  const total = pageInfo?.total ?? 0;

  const columns: ColumnDef<InviteeRow>[] = [
    {
      accessorKey: "username",
      header: t("AFFILIATE.COL_USER"),
      cell: ({ row }) => (
        <span className="text-foreground text-sm font-medium">
          {row.original.display_name || row.original.username || "\u2014"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: t("AFFILIATE.COL_JOINED"),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatDate(row.original.created_at)}
        </span>
      ),
    },
    {
      accessorKey: "commission_count",
      header: t("AFFILIATE.COL_COMMISSIONS"),
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {row.original.commission_count}
        </span>
      ),
    },
    {
      accessorKey: "total_earned",
      header: t("AFFILIATE.COL_TOTAL_EARNED"),
      cell: ({ row }) => (
        <span
          className="font-mono text-sm font-medium tabular-nums"
          style={{ color: "var(--chart-2)" }}
        >
          {renderQuota(row.original.total_earned)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("AFFILIATE.COL_STATUS"),
      cell: ({ row }) => (
        <span
          className="font-mono text-xs"
          style={{
            color:
              row.original.status === 1
                ? "var(--chart-2)"
                : "var(--destructive)",
          }}
        >
          {row.original.status === 1
            ? t("AFFILIATE.STATUS_ACTIVE")
            : t("AFFILIATE.STATUS_DISABLED")}
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
          <LuUsers className="text-muted-foreground h-6 w-6" />
          <span className="text-muted-foreground text-sm">
            {t("AFFILIATE.NO_INVITEES")}
          </span>
        </div>
      }
    />
  );
}
