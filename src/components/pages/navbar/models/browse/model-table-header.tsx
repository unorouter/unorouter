"use client";

import { Icon } from "@/components/ui/icon";
import { msg, type TranslationKey } from "@/lib/config/constants";
import type { SortOrder } from "@/store/models-store";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

// OpenRouter parity: < lg shows 4 columns (Model | Input | Output | Context);
// lg+ adds Weekly Tokens (col 2) and Released (col 6). Width ratios mirror
// OpenRouter's (Model 50% -> 40% at lg). Template + per-cell `hidden lg:flex`
// must stay in sync between header and row.
const COLS =
  "grid grid-cols-[minmax(0,50fr)_18fr_17fr_15fr] gap-2 lg:grid-cols-[minmax(0,40fr)_8fr_14fr_14fr_12fr_12fr]";

type Col = {
  key: TranslationKey;
  sort: SortOrder;
  /** Hidden below md (Weekly Tokens, Released). */
  desktopOnly?: boolean;
};

const COLUMNS: Col[] = [
  { key: msg("MODELS.TABLE.MODEL"), sort: "name" },
  {
    key: msg("MODELS.TABLE.WEEKLY_TOKENS"),
    sort: "topWeekly",
    desktopOnly: true,
  },
  { key: msg("MODELS.TABLE.INPUT"), sort: "priceAsc" },
  { key: msg("MODELS.TABLE.OUTPUT"), sort: "priceDesc" },
  { key: msg("MODELS.TABLE.CONTEXT"), sort: "contextDesc" },
  { key: msg("MODELS.TABLE.RELEASED"), sort: "newest", desktopOnly: true },
];

export function ModelTableHeader(props: {
  sortOrder: SortOrder;
  onSort: (sort: SortOrder) => void;
}) {
  const t = useTranslations();
  return (
    <div
      className={cn(
        COLS,
        "text-muted-foreground border-border items-center border-b px-1 py-2 font-mono text-xs lg:px-3",
      )}
    >
      {COLUMNS.map((col, i) => {
        const active = props.sortOrder === col.sort;
        return (
          <button
            key={col.key}
            type="button"
            onClick={() => props.onSort(col.sort)}
            className={cn(
              "hover:text-foreground flex items-center gap-1 transition-colors",
              i === 0 ? "justify-start" : "justify-end",
              col.desktopOnly && "hidden lg:flex",
              active && "text-foreground",
            )}
          >
            <span>{t(col.key)}</span>
            <Icon
              name={active ? "arrow-down" : "arrow-up-down"}
              className={cn("h-3 w-3", !active && "opacity-40")}
            />
          </button>
        );
      })}
    </div>
  );
}

export const MODEL_TABLE_COLS = COLS;
