"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

export const ALL_VALUE = "__all__";

type AnalyticsToolbarProps = {
  models: string[];
  groups: string[];
  model: string;
  group: string;
  onModelChange: (value: string) => void;
  onGroupChange: (value: string) => void;
  chartType: "bar" | "area";
  onChartTypeChange: (value: "bar" | "area") => void;
  onReset: () => void;
  hasFilters: boolean;
};

export function AnalyticsToolbar(props: AnalyticsToolbarProps) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="h-8 gap-1.5" />
          }
        >
          <Icon name="sliders-horizontal" className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">
            {t("DASHBOARD.TOOLBAR.PREFERENCES")}
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-56 p-3">
          <span className="text-muted-foreground mb-2 block font-mono text-[10px] tracking-widest uppercase">
            {t("DASHBOARD.TOOLBAR.CHART_TYPE")}
          </span>
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant={props.chartType === "bar" ? "default" : "outline"}
              size="sm"
              className="h-7 font-mono text-[11px]"
              onClick={() => props.onChartTypeChange("bar")}
            >
              {t("DASHBOARD.TOOLBAR.BAR_CHART")}
            </Button>
            <Button
              variant={props.chartType === "area" ? "default" : "outline"}
              size="sm"
              className="h-7 font-mono text-[11px]"
              onClick={() => props.onChartTypeChange("area")}
            >
              {t("DASHBOARD.TOOLBAR.AREA_CHART")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" size="sm" className="h-8 gap-1.5" />
          }
        >
          <Icon name="filter" className="h-3.5 w-3.5" />
          <span className="font-mono text-xs">
            {t("DASHBOARD.TOOLBAR.FILTER")}
          </span>
          {props.hasFilters && (
            <span className="bg-foreground h-1.5 w-1.5 rounded-full" />
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-3">
          <div className="flex flex-col gap-3">
            <FilterSelect
              label={t("DASHBOARD.TOOLBAR.MODEL")}
              allLabel={t("DASHBOARD.TOOLBAR.ALL_MODELS")}
              value={props.model}
              options={props.models}
              onChange={props.onModelChange}
            />
            <FilterSelect
              label={t("DASHBOARD.TOOLBAR.GROUP")}
              allLabel={t("DASHBOARD.TOOLBAR.ALL_GROUPS")}
              value={props.group}
              options={props.groups}
              onChange={props.onGroupChange}
            />
            {props.hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 font-mono text-[11px]"
                onClick={props.onReset}
              >
                {t("DASHBOARD.TOOLBAR.CLEAR_FILTERS")}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FilterSelect(props: {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
        {props.label}
      </span>
      <Select
        value={props.value}
        onValueChange={(value) => props.onChange(value ?? ALL_VALUE)}
      >
        <SelectTrigger className="h-8 font-mono text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_VALUE} className="font-mono text-xs">
            {props.allLabel}
          </SelectItem>
          {props.options.map((option) => (
            <SelectItem
              key={option}
              value={option}
              className="font-mono text-xs"
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
