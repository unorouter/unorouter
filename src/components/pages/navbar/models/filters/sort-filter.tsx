"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import {
  effectiveSortKeysAtom,
  SORT_VALUES,
  sortKeysAtom,
  type SortOrder,
} from "@/store/models-store";
import { useAtom, useAtomValue } from "jotai";
import { useTranslations } from "next-intl";

const LABEL_KEY = {
  popular: "MODELS.SORT.POPULAR",
  newest: "MODELS.SORT.NEWEST",
  topWeekly: "MODELS.SORT.TOP_WEEKLY",
  priceAsc: "MODELS.SORT.PRICE_ASC",
  priceDesc: "MODELS.SORT.PRICE_DESC",
  contextDesc: "MODELS.SORT.CONTEXT_DESC",
  uptimeDesc: "MODELS.SORT.UPTIME_DESC",
  successDesc: "MODELS.SORT.SUCCESS_DESC",
  name: "MODELS.SORT.NAME",
} as const satisfies Record<SortOrder, string>;

// Picking the opposite direction of a key already chosen replaces it rather than
// stacking: "cheapest, then dearest" cannot both be true, and leaving both in
// makes the second one dead weight the user cannot see the effect of.
const OPPOSITE: Partial<Record<SortOrder, SortOrder>> = {
  priceAsc: "priceDesc",
  priceDesc: "priceAsc",
};

export function SortFilter() {
  const [sortKeys, setSortKeys] = useAtom(sortKeysAtom);
  const active = useAtomValue(effectiveSortKeysAtom);
  const t = useTranslations();

  // The trigger names the primary key and how many others refine it, so the
  // button still reads as one thing at a glance.
  const label =
    active.length > 1
      ? t("MODELS.SORT.MULTI", {
          first: t(LABEL_KEY[active[0]!]),
          count: active.length - 1,
        })
      : t(LABEL_KEY[active[0] ?? "newest"]);

  function toggle(key: SortOrder) {
    const at = sortKeys.indexOf(key);
    if (at >= 0) {
      setSortKeys(sortKeys.filter((k) => k !== key));
      return;
    }
    const opposite = OPPOSITE[key];
    const without = opposite
      ? sortKeys.filter((k) => k !== opposite)
      : sortKeys;
    setSortKeys([...without, key]);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed md:h-9"
          >
            <Icon name="arrow-up-down" className="mr-1.5 h-4 w-4 md:mr-2" />
            <span>{label}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-60">
        <p className="text-muted-foreground px-2 py-1.5 text-xs">
          {t("MODELS.SORT.HINT")}
        </p>
        <DropdownMenuSeparator />
        {SORT_VALUES.map((key) => {
          const rank = sortKeys.indexOf(key);
          return (
            <DropdownMenuItem
              key={key}
              // Without this the menu closes on the first pick, so building a
              // chain would mean reopening it for every key.
              closeOnClick={false}
              onClick={() => toggle(key)}
              className="flex items-center justify-between gap-2"
            >
              <span>{t(LABEL_KEY[key])}</span>
              {rank >= 0 && (
                // The menu item forces text-accent-foreground onto every
                // descendant while focused, which erased this number against
                // its own background. Pin the colour so it survives hover.
                <span className="bg-primary text-primary-foreground! flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px]">
                  {rank + 1}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
        {sortKeys.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSortKeys([])}>
              {t("MODELS.SORT.CLEAR")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
