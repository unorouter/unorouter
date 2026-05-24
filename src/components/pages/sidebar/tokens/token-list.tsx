"use client";

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
import { atom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  TokenActionCell,
  TokenDateCell,
  TokenEmptyState,
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

  const columns: ColumnDef<TokenRow>[] = [
    {
      accessorKey: "name",
      meta: { title: msg("TOKEN.TABLE.NAME") },
      header: t("TOKEN.TABLE.NAME"),
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-foreground font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "status",
      meta: { title: msg("TOKEN.TABLE.STATUS") },
      header: t("TOKEN.TABLE.STATUS"),
      enableSorting: false,
      cell: TokenStatusCell,
    },
    {
      id: "quota",
      meta: { title: msg("TOKEN.TABLE.QUOTA") },
      header: t("TOKEN.TABLE.QUOTA"),
      enableSorting: false,
      cell: TokenQuotaCell,
    },
    {
      accessorKey: "group",
      meta: { title: msg("TOKEN.TABLE.GROUP") },
      header: t("TOKEN.TABLE.GROUP"),
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.group || "-"}
        </span>
      ),
    },
    {
      accessorKey: "key",
      meta: { title: msg("TOKEN.TABLE.KEY") },
      header: t("TOKEN.TABLE.KEY"),
      enableHiding: false,
      enableSorting: false,
      cell: TokenKeyCell,
    },
    {
      id: "models",
      meta: { title: msg("TOKEN.TABLE.MODELS") },
      header: t("TOKEN.TABLE.MODELS"),
      enableSorting: false,
      cell: TokenModelsCell,
    },
    {
      accessorKey: "created_time",
      meta: { title: msg("TOKEN.TABLE.CREATED") },
      header: t("TOKEN.TABLE.CREATED"),
      enableSorting: false,
      cell: TokenDateCell,
    },
    {
      accessorKey: "expired_time",
      meta: { title: msg("TOKEN.TABLE.EXPIRES") },
      header: t("TOKEN.TABLE.EXPIRES"),
      enableSorting: false,
      cell: TokenDateCell,
    },
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
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
            <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
              {t("TOKEN.TITLE")}
            </span>
          </div>
          <h1 className="text-foreground mt-1 text-xl font-bold tracking-tight md:text-2xl">
            {t("TOKEN.TITLE")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("TOKEN.DESCRIPTION")}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Icon name="plus" data-icon="inline-start" className="h-4 w-4" />
          {t("TOKEN.CREATE")}
        </Button>
      </div>

      <TokenEndpoint />

      <DataTable
        id={DataTableId.TOKENS}
        data={(tokensQuery.data?.items ?? []).filter(
          (item): item is NonNullable<typeof item> => item != null,
        )}
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
