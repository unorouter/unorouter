"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import type { TranslationKey } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import type { Column } from "@tanstack/react-table";
import { useTranslations } from "next-intl";

interface DataTableColumnHeaderProps<TData, TValue> extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "title"
> {
  column: Column<TData, TValue>;
}

export function DataTableColumnHeader<TData, TValue>(
  props: DataTableColumnHeaderProps<TData, TValue>,
) {
  const t = useTranslations();

  const meta = props.column.columnDef.meta as { title?: TranslationKey };
  const titleText = meta?.title ? t(meta.title) : props.column.id;

  if (!props.column.getCanSort()) {
    return <div className={cn(props.className)}>{titleText}</div>;
  }

  return (
    <div className={cn("flex items-center space-x-2", props.className)}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="data-popup-open:bg-accent -ml-3 h-8"
            />
          }
        >
          <span>{titleText}</span>
          <span>
            {props.column.getIsSorted() === "desc" ? (
              <Icon name="arrow-down" className="ml-2 h-4 w-4" />
            ) : props.column.getIsSorted() === "asc" ? (
              <Icon name="arrow-up" className="ml-2 h-4 w-4" />
            ) : (
              <Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
            )}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => props.column.toggleSorting(false)}>
            <Icon name="arrow-up" className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => props.column.toggleSorting(true)}>
            <Icon name="arrow-down" className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
            Desc
          </DropdownMenuItem>
          {props.column.getCanHide() && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => props.column.toggleVisibility(false)}
              >
                <Icon name="eye-off" className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
                Hide
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
