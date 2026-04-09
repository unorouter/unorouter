"use client";

import type { LogFilterValues } from "@/components/pages/sidebar/logs/filters";
import { Button } from "@/components/ui/button";
import { DateTimeRangePicker } from "@/components/ui/date-time-range-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dayjs from "dayjs";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuFilter, LuScrollText, LuSearch, LuX } from "react-icons/lu";
import {
  formatDateForInput,
  LOG_TYPE_CONSUME,
  LOG_TYPE_ERROR,
  LOG_TYPE_MANAGE,
  LOG_TYPE_REFUND,
  LOG_TYPE_SYSTEM,
  LOG_TYPE_TOPUP,
} from "./log-helpers";

export function LogEmptyState() {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-3">
      <LuScrollText className="text-muted-foreground h-8 w-8" />
      <span className="text-muted-foreground text-sm">{t("LOGS.NO_LOGS")}</span>
    </div>
  );
}

export function LogFilters(props: {
  filters: LogFilterValues;
  onFilterChange: (id: string, value: unknown) => void;
  onReset: () => void;
  onRefresh: () => void;
}) {
  const t = useTranslations();
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const startOfDay = formatDateForInput(dayjs().startOf("day"));
  const endOfDay = formatDateForInput(dayjs().endOf("day"));
  const startDate = props.filters.start_date ?? startOfDay;
  const endDate = props.filters.end_date ?? endOfDay;
  const logType = props.filters.log_type;
  const tokenName = props.filters.token_name ?? "";
  const modelName = props.filters.model_name ?? "";
  const requestId = props.filters.request_id ?? "";

  const logTypeOptions = [
    { value: "all", label: t("LOGS.TYPE_ALL") },
    { value: String(LOG_TYPE_CONSUME), label: t("LOGS.TYPE_CONSUME") },
    { value: String(LOG_TYPE_TOPUP), label: t("LOGS.TYPE_TOPUP") },
    { value: String(LOG_TYPE_ERROR), label: t("LOGS.TYPE_ERROR") },
    { value: String(LOG_TYPE_SYSTEM), label: t("LOGS.TYPE_SYSTEM") },
    { value: String(LOG_TYPE_MANAGE), label: t("LOGS.TYPE_MANAGE") },
    { value: String(LOG_TYPE_REFUND), label: t("LOGS.TYPE_REFUND") },
  ];

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <DateTimeRangePicker
          value={{
            from: dayjs(startDate).toDate(),
            to: dayjs(endDate).toDate(),
          }}
          onChange={(range) => {
            props.onFilterChange(
              "start_date",
              formatDateForInput(dayjs(range.from)),
            );
            props.onFilterChange(
              "end_date",
              formatDateForInput(dayjs(range.to)),
            );
          }}
        />
        <Select
          value={logType != null ? String(logType) : "all"}
          onValueChange={(v) => {
            props.onFilterChange(
              "log_type",
              v === "all" ? undefined : Number(v),
            );
          }}
        >
          <SelectTrigger size="sm" className="w-32">
            <SelectValue>
              {logTypeOptions.find(
                (o) => o.value === (logType != null ? String(logType) : "all"),
              )?.label ?? t("LOGS.TYPE_ALL")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {logTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={props.onReset}>
          {t("LOGS.RESET")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <LuFilter data-icon="inline-start" className="h-3.5 w-3.5" />
          {t("LOGS.FILTERS")}
        </Button>
      </div>

      {filtersExpanded && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={tokenName}
              onChange={(e) =>
                props.onFilterChange("token_name", e.target.value || undefined)
              }
              placeholder={t("LOGS.FILTER_TOKEN")}
              className="h-8 w-40 pl-7 font-mono text-xs"
            />
          </div>
          <div className="relative">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={modelName}
              onChange={(e) =>
                props.onFilterChange("model_name", e.target.value || undefined)
              }
              placeholder={t("LOGS.FILTER_MODEL")}
              className="h-8 w-40 pl-7 font-mono text-xs"
            />
          </div>
          <div className="relative">
            <LuSearch className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
            <Input
              value={requestId}
              onChange={(e) =>
                props.onFilterChange("request_id", e.target.value || undefined)
              }
              placeholder={t("LOGS.FILTER_REQUEST_ID")}
              className="h-8 w-48 pl-7 font-mono text-xs"
            />
          </div>
          {(tokenName || modelName || requestId) && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                props.onFilterChange("token_name", undefined);
                props.onFilterChange("model_name", undefined);
                props.onFilterChange("request_id", undefined);
              }}
            >
              <LuX className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
