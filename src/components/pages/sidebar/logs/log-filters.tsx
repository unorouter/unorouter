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

function SearchFilterInput(props: {
  value: string;
  onChange: (value: string | undefined) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className="relative">
      <LuSearch
        className="text-muted-foreground absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value || undefined)}
        placeholder={props.placeholder}
        className={`h-8 pl-7 font-mono text-xs ${props.className ?? "w-40"}`}
        aria-label={props.placeholder}
      />
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
  const subscriptionPlan = props.filters.subscription_plan ?? "";

  const logTypeOptions = [
    { value: "all", label: t("LOGS.ENUM.ALL") },
    { value: String(LOG_TYPE_CONSUME), label: t("LOGS.ENUM.CONSUME") },
    { value: String(LOG_TYPE_TOPUP), label: t("LOGS.ENUM.TOPUP") },
    { value: String(LOG_TYPE_ERROR), label: t("LOGS.ENUM.ERROR") },
    { value: String(LOG_TYPE_SYSTEM), label: t("LOGS.ENUM.SYSTEM") },
    { value: String(LOG_TYPE_MANAGE), label: t("LOGS.ENUM.MANAGE") },
    { value: String(LOG_TYPE_REFUND), label: t("LOGS.ENUM.REFUND") },
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
              )?.label ?? t("LOGS.ENUM.ALL")}
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
          <SearchFilterInput
            value={tokenName}
            onChange={(v) => props.onFilterChange("token_name", v)}
            placeholder={t("LOGS.FILTER.TOKEN")}
          />
          <SearchFilterInput
            value={modelName}
            onChange={(v) => props.onFilterChange("model_name", v)}
            placeholder={t("LOGS.FILTER.MODEL")}
          />
          <SearchFilterInput
            value={requestId}
            onChange={(v) => props.onFilterChange("request_id", v)}
            placeholder={t("LOGS.FILTER.REQUEST_ID")}
            className="w-48"
          />
          <SearchFilterInput
            value={subscriptionPlan}
            onChange={(v) => props.onFilterChange("subscription_plan", v)}
            placeholder={t("LOGS.FILTER.SUBSCRIPTION_PLAN")}
          />
          {(tokenName || modelName || requestId || subscriptionPlan) && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => {
                props.onFilterChange("token_name", undefined);
                props.onFilterChange("model_name", undefined);
                props.onFilterChange("request_id", undefined);
                props.onFilterChange("subscription_plan", undefined);
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
