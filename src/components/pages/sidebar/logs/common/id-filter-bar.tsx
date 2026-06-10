"use client";

import { Button } from "@/components/ui/button";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";

export function LogsEmptyState() {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-3">
      <Icon name="scroll-text" className="text-muted-foreground h-8 w-8" />
      <span className="text-muted-foreground text-sm">{t("LOGS.NO_LOGS")}</span>
    </div>
  );
}

export function IdFilterBar(props: {
  filters: { start_date?: string; end_date?: string };
  idField: string;
  idValue: string;
  placeholder: string;
  onFilterChange: (id: string, value: unknown) => void;
  onReset: () => void;
}) {
  const t = useTranslations();
  const startOfDay = dayjs().startOf("day").format("YYYY-MM-DDTHH:mm");
  const endOfDay = dayjs().endOf("day").format("YYYY-MM-DDTHH:mm");
  const startDate = props.filters.start_date ?? startOfDay;
  const endDate = props.filters.end_date ?? endOfDay;

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
        <Icon
          name="search"
          className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2"
        />
        <Input
          value={props.idValue}
          onChange={(e) =>
            props.onFilterChange(props.idField, e.target.value || undefined)
          }
          placeholder={props.placeholder}
          className="h-8 w-48 pl-7 font-mono text-xs"
        />
      </div>
      <Button variant="outline" size="sm" onClick={props.onReset}>
        {t("LOGS.RESET")}
      </Button>
    </div>
  );
}
