"use client";

import { Button } from "@/components/ui/button";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { Input } from "@/components/ui/input";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import type { DrawingFilterValues } from "./drawing-query";
import { Icon } from "@/components/ui/icon";

export type { DrawingFilterValues } from "./drawing-query";
export { buildDrawingFilters } from "./drawing-query";

export function DrawingEmptyState() {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-3">
      <Icon name="scroll-text" className="text-muted-foreground h-8 w-8" />
      <span className="text-muted-foreground text-sm">{t("LOGS.NO_LOGS")}</span>
    </div>
  );
}

export function DrawingFilters(props: {
  filters: DrawingFilterValues;
  onFilterChange: (id: string, value: unknown) => void;
  onReset: () => void;
}) {
  const t = useTranslations();
  const startOfDay = dayjs().startOf("day").format("YYYY-MM-DDTHH:mm");
  const endOfDay = dayjs().endOf("day").format("YYYY-MM-DDTHH:mm");
  const startDate = props.filters.start_date ?? startOfDay;
  const endDate = props.filters.end_date ?? endOfDay;
  const mjId = props.filters.mj_id ?? "";

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
        <Icon name="search" className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
        <Input
          value={mjId}
          onChange={(e) =>
            props.onFilterChange("mj_id", e.target.value || undefined)
          }
          placeholder={t("LOGS.DRAWING.FILTER_MJ_ID")}
          className="h-8 w-48 pl-7 font-mono text-xs"
        />
      </div>
      <Button variant="outline" size="sm" onClick={props.onReset}>
        {t("LOGS.RESET")}
      </Button>
    </div>
  );
}
