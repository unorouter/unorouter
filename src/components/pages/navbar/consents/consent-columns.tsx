"use client";

import { CountryFlags } from "@/components/elements/model/group-data-policy";
import { DataTableColumnHeader } from "@/components/elements/table/data-table-column-header";
import { ModelNameCell } from "@/components/pages/navbar/models/browse/model-columns";
import { Badge } from "@/components/ui/badge";
import type { TableFeats } from "@/lib/config/table-features";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsentActionButton, ConsentStatusText } from "./consent-action";
import type { ConsentRow } from "./consent-rows";

const STATUS_ORDER = { missing: 0, given: 1, not_needed: 2 };

export function buildConsentColumns(opts: {
  onOpen: (model: string) => void;
  kindLabel: (row: ConsentRow) => string;
  offlineLabel: string;
  freeLabel: string;
  flatNoParamsLabel: string;
}): ColumnDef<TableFeats, ConsentRow>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => row.model.model_name,
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="MODELS.TABLE.MODEL" />
      ),
      meta: { headerClassName: "w-[40%]" },
      cell: ({ row }) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <ModelNameCell
            model={row.original.model}
            freeLabel={opts.freeLabel}
            flatNoParamsLabel={opts.flatNoParamsLabel}
          />
          {!row.original.model.online && (
            <Badge variant="outline">{opts.offlineLabel}</Badge>
          )}
        </span>
      ),
    },
    {
      id: "countries",
      accessorFn: (row) => row.countries.join(","),
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="FREE_CONSENT.TABLE.COUNTRIES"
        />
      ),
      cell: ({ row }) =>
        row.original.countries.length > 0 ? (
          <CountryFlags codes={row.original.countries} />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "kind",
      accessorFn: (row) => row.kind,
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="FREE_CONSENT.TABLE.REQUIREMENT"
        />
      ),
      meta: { cellClassName: "text-muted-foreground text-xs" },
      cell: ({ row }) => opts.kindLabel(row.original),
    },
    {
      id: "status",
      accessorFn: (row) => STATUS_ORDER[row.status],
      enableSorting: true,
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title="FREE_CONSENT.TABLE.STATUS"
        />
      ),
      cell: ({ row }) => <ConsentStatusText row={row.original} />,
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => null,
      meta: { headerClassName: "w-32", cellClassName: "text-right" },
      cell: ({ row }) => (
        <ConsentActionButton row={row.original} onOpen={opts.onOpen} />
      ),
    },
  ];
}
