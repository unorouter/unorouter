import dayjs from "dayjs";

export interface TaskFilterValues {
  task_id?: string;
  start_date?: string;
  end_date?: string;
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
