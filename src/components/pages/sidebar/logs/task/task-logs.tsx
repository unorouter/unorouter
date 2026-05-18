"use client";

import { DataTable } from "@/components/elements/table/data-table";
import { useTaskLogsQuery } from "@/hooks/logs-hook";
import { msg } from "@/lib/config/constants";
import { DataTableId } from "@/lib/types/enums";
import { createTableAtoms } from "@/store/data-table-store";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
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
import {
  buildTaskFilters,
  TaskEmptyState,
  TaskFiltersBar,
} from "./task-filters";
import type { TaskRow } from "./task-helpers";

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

  const columns: ColumnDef<TaskRow>[] = [
    {
      accessorKey: "submit_time",
      meta: { title: msg("LOGS.TASK.SUBMIT_TIME") },
      header: t("LOGS.TASK.SUBMIT_TIME"),
      enableSorting: false,
      cell: TaskTimeCell,
    },
    {
      accessorKey: "channel_id",
      meta: { title: msg("LOGS.TABLE.CHANNEL") },
      header: t("LOGS.TABLE.CHANNEL"),
      enableSorting: false,
      cell: TaskChannelCell,
    },
    {
      accessorKey: "task_id",
      meta: { title: msg("LOGS.TASK.TASK_ID") },
      header: t("LOGS.TASK.TASK_ID"),
      enableSorting: false,
      cell: TaskIdCell,
    },
    {
      id: "duration",
      meta: { title: msg("LOGS.TASK.DURATION") },
      header: t("LOGS.TASK.DURATION"),
      enableSorting: false,
      cell: TaskDurationCell,
    },
    {
      accessorKey: "status",
      meta: { title: msg("LOGS.TASK.STATUS") },
      header: t("LOGS.TASK.STATUS"),
      enableSorting: false,
      cell: TaskStatusCell,
    },
    {
      accessorKey: "progress",
      meta: { title: msg("LOGS.TASK.PROGRESS") },
      header: t("LOGS.TASK.PROGRESS"),
      enableSorting: false,
      cell: TaskProgressCell,
    },
    {
      accessorKey: "fail_reason",
      meta: { title: msg("LOGS.TASK.DETAILS") },
      header: t("LOGS.TASK.DETAILS"),
      enableSorting: false,
      cell: TaskDetailsCell,
    },
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
          <TaskFiltersBar
            filters={filterValues}
            onFilterChange={handleFilterChange}
            onReset={handleReset}
          />
        )}
        emptyState={<TaskEmptyState />}
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
