"use client";

import { SidebarPageHeader } from "@/components/elements/content/sidebar-page-header";
import { PageContent } from "@/components/layout/sidebar/sidebar-layout";
import { Icon } from "@/components/ui/icon";
import { DataTable } from "@/components/elements/table/data-table";
import { DataTableGlobalFilter } from "@/components/elements/table/data-table-global-filter";
import { Button } from "@/components/ui/button";
import { useTokensQuery } from "@/hooks/billing/token-hook";
import { msg } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef } from "@tanstack/react-table";
import { type TableFeats, titledColumn } from "@/lib/config/table-features";
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  TokenActionCell,
  TokenDateCell,
  TokenEmptyState,
  TokenGroupCell,
  TokenKeyCell,
  TokenModelsCell,
  TokenQuotaCell,
  type TokenRow,
  TokenStatusCell,
} from "./token-columns";
import { TokenDialog } from "./token-dialog";
import { TokenEndpoint } from "./token-endpoint";

export const editingTokenAtom = atom<TokenRow | null>(null);

export function TokenList() {
  const t = useTranslations();
  const [createOpen, setCreateOpen] = useState(false);
  const editingToken = useAtomValue(editingTokenAtom);
  const setEditingToken = useSetAtom(editingTokenAtom);

  const tableAtoms = createTableAtoms(DataTableId.TOKENS);
  const store = useAtomValue(tableAtoms.baseAtom);

  const p = store.pagination.pageIndex + 1;
  const keyword = store.globalFilter || undefined;
  const tokensQuery = useTokensQuery({ p, keyword });

  const columns: ColumnDef<TableFeats, TokenRow>[] = [
    titledColumn(t, "TOKEN.TABLE.NAME", {
      accessorKey: "name",
      enableHiding: false,
      cell: ({ row }) => (
        <span className="text-foreground font-medium">{row.original.name}</span>
      ),
    }),
    titledColumn(t, "TOKEN.TABLE.STATUS", {
      accessorKey: "status",
      cell: TokenStatusCell,
    }),
    titledColumn(t, "TOKEN.TABLE.QUOTA", {
      id: "quota",
      cell: TokenQuotaCell,
    }),
    titledColumn(t, "TOKEN.TABLE.GROUP", {
      accessorKey: "group",
      cell: TokenGroupCell,
    }),
    titledColumn(t, "TOKEN.TABLE.KEY", {
      accessorKey: "key",
      enableHiding: false,
      cell: TokenKeyCell,
    }),
    titledColumn(t, "TOKEN.TABLE.MODELS", {
      id: "models",
      cell: TokenModelsCell,
    }),
    titledColumn(t, "TOKEN.TABLE.CREATED", {
      accessorKey: "created_time",
      cell: TokenDateCell,
    }),
    titledColumn(t, "TOKEN.TABLE.EXPIRES", {
      accessorKey: "expired_time",
      cell: TokenDateCell,
    }),
    {
      id: "actions",
      meta: {
        title: msg("TOKEN.TABLE.ACTIONS"),
        headerClassName: "text-right",
      },
      header: t("TOKEN.TABLE.ACTIONS"),
      enableHiding: false,
      enableSorting: false,
      cell: TokenActionCell,
    },
  ];

  return (
    <PageContent>
      <div className="mb-6 flex items-center justify-between">
        <SidebarPageHeader
          eyebrow={t("TOKEN.TITLE")}
          title={t("TOKEN.TITLE")}
          description={t("TOKEN.DESCRIPTION")}
        />
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Icon name="plus" data-icon="inline-start" className="h-4 w-4" />
          {t("TOKEN.CREATE")}
        </Button>
      </div>

      <TokenEndpoint />

      <DataTable
        id={DataTableId.TOKENS}
        data={tokensQuery.data?.items ?? []}
        columns={columns}
        total={tokensQuery.data?.total ?? 0}
        isLoading={tokensQuery.isLoading}
        columnVisibility
        filter={({ table }) => (
          <DataTableGlobalFilter
            table={table}
            placeholder={t("TOKEN.SEARCH_PLACEHOLDER")}
          />
        )}
        emptyState={<TokenEmptyState onCreate={() => setCreateOpen(true)} />}
      />

      <TokenDialog open={createOpen} onOpenChange={setCreateOpen} />

      <TokenDialog
        open={!!editingToken}
        onOpenChange={(open) => {
          if (!open) setEditingToken(null);
        }}
        token={editingToken}
      />
    </PageContent>
  );
}
