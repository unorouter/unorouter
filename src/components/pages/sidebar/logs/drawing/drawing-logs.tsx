"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { useMidjourneyLogsQuery } from "@/hooks/ops/logs-hook";
import { msg } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  DrawingActionCell,
  DrawingChannelCell,
  DrawingDialogContext,
  DrawingDurationCell,
  DrawingFailReasonCell,
  DrawingImageCell,
  DrawingMjIdCell,
  DrawingProgressCell,
  DrawingPromptCell,
  DrawingTimeCell,
} from "./drawing-cells";
import {
  FailReasonDialog,
  ImagePreviewDialog,
  PromptDialog,
} from "./drawing-dialogs";
import { IdFilterBar, LogsEmptyState } from "../common/id-filter-bar";
import { buildDrawingFilters, type DrawingRow } from "./drawing-helpers";

export function DrawingLogs() {
  const t = useTranslations();

  const tableAtoms = createTableAtoms(DataTableId.MIDJOURNEY_LOGS);
  const store = useAtomValue(tableAtoms.baseAtom);
  const setColumnFilters = useSetAtom(tableAtoms.columnFiltersAtom);
  const setPagination = useSetAtom(tableAtoms.paginationAtom);

  const { filterValues, queryFilters } = buildDrawingFilters(
    store.columnFilters,
    store.pagination,
  );
  const logsQuery = useMidjourneyLogsQuery(queryFilters);

  const [imageOpen, setImageOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<DrawingRow | null>(null);

  function handleFilterChange(id: string, value: unknown) {
    setColumnFilters((prev: ColumnFiltersState) => {
      const next = prev.filter((f) => f.id !== id);
      if (value != null) next.push({ id, value });
      return next;
    });
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  function handleReset() {
    setColumnFilters([]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }

  const columns: ColumnDef<DrawingRow>[] = [
    {
      accessorKey: "submit_time",
      meta: { title: msg("LOGS.DRAWING.SUBMIT_TIME") },
      header: t("LOGS.DRAWING.SUBMIT_TIME"),
      enableSorting: false,
      cell: DrawingTimeCell,
    },
    {
      accessorKey: "channel_id",
      meta: { title: msg("LOGS.TABLE.CHANNEL") },
      header: t("LOGS.TABLE.CHANNEL"),
      enableSorting: false,
      cell: DrawingChannelCell,
    },
    {
      accessorKey: "action",
      meta: { title: msg("LOGS.DRAWING.ACTION") },
      header: t("LOGS.DRAWING.ACTION"),
      enableSorting: false,
      cell: DrawingActionCell,
    },
    {
      accessorKey: "mj_id",
      meta: { title: msg("LOGS.DRAWING.TASK_ID") },
      header: t("LOGS.DRAWING.TASK_ID"),
      enableSorting: false,
      cell: DrawingMjIdCell,
    },
    {
      id: "duration",
      meta: { title: msg("LOGS.DRAWING.DURATION") },
      header: t("LOGS.DRAWING.DURATION"),
      enableSorting: false,
      cell: DrawingDurationCell,
    },
    {
      accessorKey: "progress",
      meta: { title: msg("LOGS.DRAWING.PROGRESS") },
      header: t("LOGS.DRAWING.PROGRESS"),
      enableSorting: false,
      cell: DrawingProgressCell,
    },
    {
      accessorKey: "image_url",
      meta: { title: msg("LOGS.DRAWING.IMAGE") },
      header: t("LOGS.DRAWING.IMAGE"),
      enableSorting: false,
      cell: DrawingImageCell,
    },
    {
      accessorKey: "prompt",
      meta: { title: msg("LOGS.DRAWING.PROMPT") },
      header: t("LOGS.DRAWING.PROMPT"),
      enableSorting: false,
      cell: DrawingPromptCell,
    },
    {
      accessorKey: "fail_reason",
      meta: { title: msg("LOGS.DRAWING.FAIL_REASON") },
      header: t("LOGS.DRAWING.FAIL_REASON"),
      enableSorting: false,
      cell: DrawingFailReasonCell,
    },
  ];

  return (
    <DrawingDialogContext.Provider
      value={{
        openImage: (row) => {
          setActiveRow(row);
          setImageOpen(true);
        },
        openPrompt: (row) => {
          setActiveRow(row);
          setPromptOpen(true);
        },
        openFailReason: (row) => {
          setActiveRow(row);
          setFailOpen(true);
        },
      }}
    >
      <DataTable
        id={DataTableId.MIDJOURNEY_LOGS}
        data={(logsQuery.data?.items ?? []).filter(
          (item): item is DrawingRow => item != null,
        )}
        columns={columns}
        total={logsQuery.data?.total ?? 0}
        isLoading={logsQuery.isLoading}
        columnVisibility
        filter={() => (
          <IdFilterBar
            filters={filterValues}
            idField="mj_id"
            idValue={filterValues.mj_id ?? ""}
            placeholder={t("LOGS.DRAWING.FILTER_MJ_ID")}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        )}
        emptyState={<LogsEmptyState />}
      />
      <ImagePreviewDialog
        open={imageOpen}
        onOpenChange={setImageOpen}
        imageUrl={activeRow?.image_url ?? ""}
        videoUrl={activeRow?.video_url || undefined}
        mjId={activeRow?.mj_id}
      />
      <PromptDialog
        open={promptOpen}
        onOpenChange={setPromptOpen}
        prompt={activeRow?.prompt ?? ""}
        promptEn={activeRow?.prompt_en || undefined}
      />
      <FailReasonDialog
        open={failOpen}
        onOpenChange={setFailOpen}
        failReason={activeRow?.fail_reason ?? ""}
      />
    </DrawingDialogContext.Provider>
  );
}
