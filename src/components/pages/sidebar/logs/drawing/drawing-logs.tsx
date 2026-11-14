"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { useMidjourneyLogsQuery } from "@/hooks/ops/logs-hook";
import { DataTableId } from "@/lib/types/enums";
import { useLogFilters } from "../common/use-log-filters";
import type { ColumnDef } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
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
import { logColumn } from "../common/log-helpers";
import { buildDrawingFilters, type DrawingRow } from "./drawing-helpers";

export function DrawingLogs() {
  const t = useTranslations();

  const filters = useLogFilters(DataTableId.MIDJOURNEY_LOGS);
  const store = filters.store;

  const { filterValues, queryFilters } = buildDrawingFilters(
    store.columnFilters,
    store.pagination,
  );
  const logsQuery = useMidjourneyLogsQuery(queryFilters);

  const [imageOpen, setImageOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [failOpen, setFailOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<DrawingRow | null>(null);

  const columns: ColumnDef<TableFeats, DrawingRow>[] = [
    logColumn(t, "LOGS.DRAWING.SUBMIT_TIME", DrawingTimeCell, {
      accessorKey: "submit_time",
    }),
    logColumn(t, "LOGS.TABLE.CHANNEL", DrawingChannelCell, {
      accessorKey: "channel_id",
    }),
    logColumn(t, "LOGS.DRAWING.ACTION", DrawingActionCell, {
      accessorKey: "action",
    }),
    logColumn(t, "LOGS.DRAWING.TASK_ID", DrawingMjIdCell, {
      accessorKey: "mj_id",
    }),
    logColumn(t, "LOGS.DRAWING.DURATION", DrawingDurationCell, {
      id: "duration",
    }),
    logColumn(t, "LOGS.DRAWING.PROGRESS", DrawingProgressCell, {
      accessorKey: "progress",
    }),
    logColumn(t, "LOGS.DRAWING.IMAGE", DrawingImageCell, {
      accessorKey: "image_url",
    }),
    logColumn(t, "LOGS.DRAWING.PROMPT", DrawingPromptCell, {
      accessorKey: "prompt",
    }),
    logColumn(t, "LOGS.DRAWING.FAIL_REASON", DrawingFailReasonCell, {
      accessorKey: "fail_reason",
    }),
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
            onFilterChange={filters.handleFilterChange}
            onReset={filters.handleReset}
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
