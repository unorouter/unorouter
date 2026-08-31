"use client";

import { StatItem } from "@/components/elements/stat-item";
import { DataTable } from "@/components/elements/table/data-table";
import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import {
  usePartnerGiftCardsQuery,
  useVoidGiftCardMutation,
} from "@/hooks/billing/partner-hook";
import { renderQuota } from "@/lib/config/constants";
import type { TableFeats } from "@/lib/config/table-features";
import { DataTableId } from "@/lib/types/enums";
import { copyToClipboard } from "@/lib/utils/base";
import { formatMsDate } from "@/lib/utils/format/date";
import type { Redemption } from "@/openapi";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef } from "@tanstack/react-table";
import { useAtomValue } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { CreateCardDialog } from "./create-card-dialog";
import { GrantDialog } from "./grant-dialog";

// Upstream status codes: 1 enabled, 2 disabled (what a void sets), 3 used.
const STATUS_ENABLED = 1;
const STATUS_USED = 3;

export function GiftCards() {
  const t = useTranslations();
  const authQuery = useAuthQuery();
  const [createOpen, setCreateOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);

  const balance = authQuery.data?.quota ?? 0;

  const tableAtoms = createTableAtoms(DataTableId.PARTNER_GIFT_CARDS);
  const store = useAtomValue(tableAtoms.baseAtom);
  const cardsQuery = usePartnerGiftCardsQuery({
    p: store.pagination.pageIndex + 1,
    page_size: store.pagination.pageSize,
  });
  const voidMutation = useVoidGiftCardMutation();

  const cards = (cardsQuery.data?.items ?? []).filter(Boolean);
  const total = cardsQuery.data?.total ?? 0;

  function statusLabel(status: number) {
    if (status === STATUS_USED) return t("GIFT_CARDS.STATUS_USED");
    if (status === STATUS_ENABLED) return t("GIFT_CARDS.STATUS_ACTIVE");
    return t("GIFT_CARDS.STATUS_VOIDED");
  }

  const columns: ColumnDef<TableFeats, Redemption>[] = [
    {
      accessorKey: "name",
      header: t("GIFT_CARDS.NAME"),
      cell: ({ row }) => (
        <span className="text-foreground text-sm font-medium">
          {row.original?.name || "-"}
        </span>
      ),
    },
    {
      accessorKey: "key",
      header: t("GIFT_CARDS.CODE"),
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => {
            copyToClipboard(row.original.key);
            toast.success(t("GIFT_CARDS.COPIED"));
          }}
          className="text-muted-foreground hover:text-foreground font-mono text-xs"
          title={t("GIFT_CARDS.COPY")}
        >
          {row.original.key.slice(0, 12)}...
        </button>
      ),
    },
    {
      accessorKey: "quota",
      header: t("GIFT_CARDS.AMOUNT"),
      cell: ({ row }) => (
        <span className="font-mono text-xs tabular-nums">
          {renderQuota(row.original.quota)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("GIFT_CARDS.STATUS"),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {statusLabel(row.original.status)}
        </span>
      ),
    },
    {
      accessorKey: "created_time",
      header: t("GIFT_CARDS.CREATED"),
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">
          {formatMsDate(row.original.created_time * 1000)}
        </span>
      ),
    },
    {
      id: "actions",
      header: t("GIFT_CARDS.ACTIONS"),
      cell: ({ row }) =>
        row.original.status === STATUS_ENABLED ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={voidMutation.isPending}
            onClick={() =>
              voidMutation.mutate(
                { id: row.original.id, quota: row.original.quota },
                { onSuccess: () => toast.success(t("GIFT_CARDS.SUCCESS_VOID")) },
              )
            }
          >
            {t("GIFT_CARDS.VOID")}
          </Button>
        ) : null,
    },
  ];

  return (
    <PageContent>
      <h1 className="text-foreground text-2xl font-semibold">
        {t("GIFT_CARDS.TITLE")}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">
        {t("GIFT_CARDS.SUBTITLE")}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <StatItem
          label={t("GIFT_CARDS.BALANCE")}
          value={renderQuota(balance)}
          icon={<Icon name="wallet" className="h-4 w-4" />}
          accentColor="text-emerald-500"
          isLoading={authQuery.isLoading}
        />
        <div className="ml-auto flex gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Icon name="ticket" className="h-4 w-4" />
            {t("GIFT_CARDS.CREATE")}
          </Button>
          <Button variant="outline" onClick={() => setGrantOpen(true)}>
            <Icon name="send" className="h-4 w-4" />
            {t("GIFT_CARDS.GRANT")}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <DataTable
          id={DataTableId.PARTNER_GIFT_CARDS}
          columns={columns}
          data={cards}
          total={total}
          isLoading={cardsQuery.isLoading}
          emptyState={
            <div className="flex flex-col items-center gap-2">
              <Icon name="ticket" className="text-muted-foreground h-6 w-6" />
              <span className="text-muted-foreground text-sm">
                {t("GIFT_CARDS.EMPTY")}
              </span>
            </div>
          }
        />
      </div>

      <CreateCardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        balance={balance}
      />
      <GrantDialog
        open={grantOpen}
        onOpenChange={setGrantOpen}
        balance={balance}
      />
    </PageContent>
  );
}
