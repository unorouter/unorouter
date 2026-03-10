"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TranslationKey } from "@/lib/config/constants";
import type { Row } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { RxDotsHorizontal } from "react-icons/rx";

export type RowAction = {
  value: string;
  label: TranslationKey;
  icon?: ReactNode;
  onClick?: () => void;
  variant?: "default" | "destructive";
  disabled?: boolean;
  separator?: boolean;
};

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  actions: RowAction[];
  align?: "start" | "end";
}

export function DataTableRowActions<TData>(
  props: DataTableRowActionsProps<TData>,
) {
  const t = useTranslations();

  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="data-popup-open:bg-muted flex h-8 w-8 p-0"
            />
          }
        >
          <RxDotsHorizontal className="h-4 w-4" />
          <span className="sr-only">{t("COMMON.OPEN_MENU")}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={props.align || "end"}>
          {props.actions.map((action) => (
            <span key={action.value}>
              {action.separator && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={action.onClick}
                variant={action.variant}
                disabled={action.disabled}
                className="hover:cursor-pointer"
              >
                {action.icon}
                {t(action.label)}
              </DropdownMenuItem>
            </span>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
