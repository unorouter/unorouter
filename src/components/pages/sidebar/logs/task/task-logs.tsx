"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { useTaskLogsQuery } from "@/hooks/ops/logs-hook";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import type { TableFeats } from "@/lib/config/table-features";
import { useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { FailReasonDialog } from "../drawing/drawing-dialogs";
import {
  TaskAudioPreviewDialog,
  TaskChannelCell,
  TaskDetailsCell,
  TaskDialogContext,
  TaskDurationCell,
  TaskIdCell,
  TaskProgressCell,
  TaskStatusCell,
  TaskTimeCell,
} from "./task-cells";
import { IdFilterBar, LogsEmptyState } from "../common/id-filter-bar";
import { logColumn } from "../common/log-helpers";
import { buildTaskFilters, type TaskRow } from "./task-helpers";

export function TaskLogs() {
  const t = useTranslations();

  const tableAtoms = createTableAtoms(DataTableId.TASK_LOGS);
  const store = useAtomValue(tableAtoms.baseAtom);
  const setColumnFilters = useSetAtom(tableAtoms.columnFiltersAtom);
  const setPagination = useSetAtom(tableAtoms.paginationAtom);

  const { filterValues, queryFilters } = buildTaskFilters(
    store.columnFilters,
    store.pagination,
  );
  const logsQuery = useTaskLogsQuery(queryFilters);

  const [failOpen, setFailOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<TaskRow | null>(null);

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

  const columns: ColumnDef<TableFeats, TaskRow>[] = [
    logColumn(t, "LOGS.TASK.SUBMIT_TIME", TaskTimeCell, {
      accessorKey: "submit_time",
    }),
    logColumn(t, "LOGS.TABLE.CHANNEL", TaskChannelCell, {
      accessorKey: "channel_id",
    }),
    logColumn(t, "LOGS.TASK.TASK_ID", TaskIdCell, {
      accessorKey: "task_id",
    }),
    logColumn(t, "LOGS.TASK.DURATION", TaskDurationCell, {
      id: "duration",
    }),
    logColumn(t, "LOGS.TASK.STATUS", TaskStatusCell, {
      accessorKey: "status",
    }),
    logColumn(t, "LOGS.TASK.PROGRESS", TaskProgressCell, {
      accessorKey: "progress",
    }),
    logColumn(t, "LOGS.TASK.DETAILS", TaskDetailsCell, {
      accessorKey: "fail_reason",
    }),
  ];

  return (
    <TaskDialogContext.Provider
      value={{
        openFailReason: (row) => {
          setActiveRow(row);
          setFailOpen(true);
        },
        openAudio: (row) => {
          setActiveRow(row);
          setAudioOpen(true);
        },
      }}
    >
      <DataTable
        id={DataTableId.TASK_LOGS}
        data={(logsQuery.data?.items ?? []).filter(
          (item): item is TaskRow => item != null,
        )}
        columns={columns}
        total={logsQuery.data?.total ?? 0}
        isLoading={logsQuery.isLoading}
        columnVisibility
        filter={() => (
          <IdFilterBar
            filters={filterValues}
            idField="task_id"
            idValue={filterValues.task_id ?? ""}
            placeholder={t("LOGS.TASK.FILTER_TASK_ID")}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        )}
        emptyState={<LogsEmptyState />}
      />
      <FailReasonDialog
        open={failOpen}
        onOpenChange={setFailOpen}
        failReason={activeRow?.fail_reason ?? ""}
      />
      <TaskAudioPreviewDialog
        open={audioOpen}
        onOpenChange={setAudioOpen}
        url={activeRow?.result_url ?? ""}
        taskId={activeRow?.task_id}
      />
    </TaskDialogContext.Provider>
  );
}
