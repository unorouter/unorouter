"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { formatDate } from "@/components/pages/sidebar/dashboard/stats";
import { useAffiliateCommissionsQuery } from "@/hooks/affiliate-hook";
import { renderQuota } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { ReferralCommissionWithUser } from "@/openapi";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef } from "@tanstack/react-table";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { LuGift } from "react-icons/lu";

export function CommissionsTab() {
  const t = useTranslations();
  const tableAtoms = createTableAtoms(DataTableId.AFFILIATE_COMMISSIONS);
  const store = useAtomValue(tableAtoms.baseAtom);

  const commissionsQuery = useAffiliateCommissionsQuery({
    query: {
      p: store.pagination.pageIndex + 1,
      page_size: store.pagination.pageSize,
    },
  });

  const responseData = commissionsQuery.data;
  const commissions = (responseData?.items ?? []).filter(Boolean);
  const total = responseData?.total ?? 0;

  const columns: ColumnDef<ReferralCommissionWithUser>[] =
    [
      {
        accessorKey: "created_at",
        header: t("AFFILIATE.TABLE.DATE"),
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {formatDate(row.original?.created_at)}
          </span>
        ),
      },
      {
        accessorKey: "invitee_username",
        header: t("AFFILIATE.TABLE.USER"),
        cell: ({ row }) => (
          <span className="text-foreground text-sm font-medium">
            {row.original?.invitee_username || "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "recharge_amount",
        header: t("AFFILIATE.TABLE.RECHARGE"),
        cell: ({ row }) => (
          <span className="font-mono text-sm tabular-nums">
            {renderQuota(row.original?.recharge_amount)}
          </span>
        ),
      },
      {
        accessorKey: "commission_rate",
        header: t("AFFILIATE.TABLE.RATE"),
        cell: ({ row }) => (
          <span className="text-muted-foreground font-mono text-xs">
            {row.original?.commission_rate != null
              ? `${(row.original.commission_rate * 100).toFixed(0)}%`
              : "\u2014"}
          </span>
        ),
      },
      {
        accessorKey: "commission_quota",
        header: t("AFFILIATE.TABLE.EARNED"),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => (
          <span
            className="font-mono text-sm font-medium tabular-nums"
            style={{ color: "var(--chart-2)" }}
          >
            {renderQuota(row.original?.commission_quota)}
          </span>
        ),
      },
    ];

  return (
    <DataTable
      id={DataTableId.AFFILIATE_COMMISSIONS}
      data={commissions}
      columns={columns}
      total={total}
      isLoading={commissionsQuery.isLoading}
      emptyState={
        <div className="flex flex-col items-center gap-2">
          <LuGift className="text-muted-foreground h-6 w-6" />
          <span className="text-muted-foreground text-sm">
            {t("AFFILIATE.NO_COMMISSIONS")}
          </span>
        </div>
      }
    />
  );
}
