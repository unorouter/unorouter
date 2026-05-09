"use client";

import { Button } from "@/components/ui/button";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { Input } from "@/components/ui/input";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { LuScrollText, LuSearch } from "react-icons/lu";

export interface TaskFilterValues {
  task_id?: string;
  start_date?: string;
  end_date?: string;
}

export function TaskEmptyState() {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-3">
      <LuScrollText className="text-muted-foreground h-8 w-8" />
      <span className="text-muted-foreground text-sm">
        {t("LOGS.NO_LOGS")}
      </span>
    </div>
  );
}

export function TaskFiltersBar(props: {
  filters: TaskFilterValues;
  onFilterChange: (id: string, value: unknown) => void;
  onReset: () => void;
}) {
  const t = useTranslations();
  const startOfDay = dayjs().startOf("day").format("YYYY-MM-DDTHH:mm");
  const endOfDay = dayjs().endOf("day").format("YYYY-MM-DDTHH:mm");
  const startDate = props.filters.start_date ?? startOfDay;
  const endDate = props.filters.end_date ?? endOfDay;
  const taskId = props.filters.task_id ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DateTimeRangePicker
        value={{
          from: dayjs(startDate).toDate(),
          to: dayjs(endDate).toDate(),
        }}
        onChange={(range) => {
          props.onFilterChange(
            "start_date",
            dayjs(range.from).format("YYYY-MM-DDTHH:mm"),
          );
          props.onFilterChange(
            "end_date",
            dayjs(range.to).format("YYYY-MM-DDTHH:mm"),
          );
        }}
      />
      <div className="relative">
        <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
        <Input
          value={taskId}
          onChange={(e) =>
            props.onFilterChange("task_id", e.target.value || undefined)
          }
          placeholder={t("LOGS.TASK.FILTER_TASK_ID")}
          className="h-8 w-48 pl-7 font-mono text-xs"
        />
      </div>
      <Button variant="outline" size="sm" onClick={props.onReset}>
        {t("LOGS.RESET")}
      </Button>
    </div>
  );
}

export function buildTaskFilters(
  columnFilters: Array<{ id: string; value: unknown }>,
  pagination: { pageIndex: number; pageSize: number },
): {
  filterValues: TaskFilterValues;
  queryFilters: {
    p?: number;
    page_size?: number;
    task_id?: string;
    start_timestamp?: number;
    end_timestamp?: number;
  };
} {
  const filterValues: TaskFilterValues = {};
  for (const f of columnFilters) {
    if (typeof f.value === "string" && f.value) {
      (filterValues as Record<string, string>)[f.id] = f.value;
    }
  }

  const startSec = filterValues.start_date
    ? Math.floor(dayjs(filterValues.start_date).valueOf() / 1000)
    : Math.floor(dayjs().startOf("day").valueOf() / 1000);
  const endSec = filterValues.end_date
    ? Math.floor(dayjs(filterValues.end_date).valueOf() / 1000)
    : Math.floor(dayjs().endOf("day").valueOf() / 1000);

  return {
    filterValues,
    queryFilters: {
      p: pagination.pageIndex + 1,
      page_size: pagination.pageSize,
      task_id: filterValues.task_id || undefined,
      start_timestamp: startSec,
      end_timestamp: endSec,
    },
  };
}
