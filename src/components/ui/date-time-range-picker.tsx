"use client";

import { Calendar } from "@/components/ui/calendar";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/utils/format/date";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

type DateTimeRange = {
  from: Date;
  to: Date;
};

type DateTimeRangePickerProps = {
  value: DateTimeRange;
  onChange: (range: DateTimeRange) => void;
  className?: string;
};

export function DateTimeRangePicker(props: DateTimeRangePickerProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>({
    from: props.value.from,
    to: props.value.to,
  });
  const [startTime, setStartTime] = useState(
    dayjs(props.value.from).format("HH:mm"),
  );
  const [endTime, setEndTime] = useState(dayjs(props.value.to).format("HH:mm"));

  function handleApply() {
    if (!range?.from || !range?.to) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const from = dayjs(range.from)
      .hour(sh)
      .minute(sm)
      .second(0)
      .millisecond(0)
      .toDate();
    const to = dayjs(range.to)
      .hour(eh)
      .minute(em)
      .second(59)
      .millisecond(0)
      .toDate();
    props.onChange({ from, to });
    setOpen(false);
  }

  const hasRange = props.value.from && props.value.to;
  const fromLabel = hasRange
    ? dayjs(props.value.from).format("MMM D, YYYY HH:mm")
    : "";
  const toLabel = hasRange
    ? dayjs(props.value.to).format("MMM D, YYYY HH:mm")
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground inline-flex min-h-8 items-center gap-2 rounded-md border px-3 font-mono text-xs",
          props.className,
        )}
        suppressHydrationWarning
      >
        <Icon name="calendar" className="h-3.5 w-3.5 shrink-0 opacity-50" />
        {hasRange ? (
          <span className="flex flex-col items-start gap-x-1.5 sm:flex-row sm:items-center">
            <span className="whitespace-nowrap">{fromLabel}</span>
            <span className="whitespace-nowrap">
              <span className="text-muted-foreground max-sm:hidden">- </span>
              {toLabel}
            </span>
          </span>
        ) : (
          t("COMMON.DATE_RANGE.PICK")
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          defaultMonth={range?.from}
          selected={range}
          onSelect={setRange}
          numberOfMonths={2}
        />
        <div className="border-border flex items-center gap-3 border-t px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">
              {t("COMMON.DATE_RANGE.FROM")}
            </span>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-7 w-24 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">
              {t("COMMON.DATE_RANGE.TO")}
            </span>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="h-7 w-24 font-mono text-xs"
            />
          </div>
          <Button
            size="sm"
            className="ml-auto h-7 text-xs"
            onClick={handleApply}
          >
            {t("COMMON.DATE_RANGE.APPLY")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
