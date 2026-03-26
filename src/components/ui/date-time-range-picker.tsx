"use client";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { LuCalendar } from "react-icons/lu";

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

  const label =
    props.value.from && props.value.to
      ? `${dayjs(props.value.from).format("MMM D, YYYY HH:mm")} \u2013 ${dayjs(props.value.to).format("MMM D, YYYY HH:mm")}`
      : "Pick a date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground inline-flex h-8 items-center gap-2 rounded-md border px-3 font-mono text-xs whitespace-nowrap",
          props.className,
        )}
        suppressHydrationWarning
      >
        <LuCalendar className="h-3.5 w-3.5 shrink-0 opacity-50" />
        {label}
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
            <span className="text-muted-foreground text-xs">From</span>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="h-7 w-24 font-mono text-xs"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground text-xs">To</span>
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
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
