import dayjs from "dayjs";

export interface DrawingFilterValues {
  mj_id?: string;
  start_date?: string;
  end_date?: string;
}

export function buildDrawingFilters(
  columnFilters: Array<{ id: string; value: unknown }>,
  pagination: { pageIndex: number; pageSize: number },
): {
  filterValues: DrawingFilterValues;
  queryFilters: {
    p?: number;
    page_size?: number;
    mj_id?: string;
    start_timestamp?: string;
    end_timestamp?: string;
  };
} {
  const filterValues: DrawingFilterValues = {};
  for (const f of columnFilters) {
    if (typeof f.value === "string" && f.value) {
      (filterValues as Record<string, string>)[f.id] = f.value;
    }
  }

  const startMs = filterValues.start_date
    ? dayjs(filterValues.start_date).valueOf()
    : dayjs().startOf("day").valueOf();
  const endMs = filterValues.end_date
    ? dayjs(filterValues.end_date).valueOf()
    : dayjs().endOf("day").valueOf();

  return {
    filterValues,
    queryFilters: {
      p: pagination.pageIndex + 1,
      page_size: pagination.pageSize,
      mj_id: filterValues.mj_id || undefined,
      start_timestamp: String(startMs),
      end_timestamp: String(endMs),
    },
  };
}
