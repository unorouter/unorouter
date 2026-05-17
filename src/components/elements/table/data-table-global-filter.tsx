"use client";

import { Input } from "@/components/ui/input";
import { Table } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

interface DataTableGlobalFilterProps<TData> {
  table: Table<TData>;
  debounceMs?: number;
  placeholder?: string;
}

export function DataTableGlobalFilter<TData>(
  props: DataTableGlobalFilterProps<TData>,
) {
  const t = useTranslations();
  const [value, setValue] = useState(props.table.getState().globalFilter ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      props.table.setGlobalFilter(value || undefined);
    }, props.debounceMs ?? 300);

    return () => clearTimeout(timeout);
  }, [value, props.table, props.debounceMs]);

  const globalFilter = props.table.getState().globalFilter ?? "";
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync local state from table filter
    setValue(globalFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- extracted from complex expression
  }, [globalFilter]);

  return (
    <div className="relative">
      <Icon name="search" className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
      <Input
        placeholder={props.placeholder || t("COMMON.SEARCH")}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="max-w-sm pl-9"
      />
    </div>
  );
}
