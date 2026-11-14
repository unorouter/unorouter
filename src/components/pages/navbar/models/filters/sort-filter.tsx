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
  discountDesc: "MODELS.SORT.DISCOUNT_DESC",
  uptimeDesc: "MODELS.SORT.UPTIME_DESC",
  successDesc: "MODELS.SORT.SUCCESS_DESC",
  name: "MODELS.SORT.NAME",
} as const satisfies Record<SortOrder, string>;

// An opposite direction replaces rather than stacks: "cheapest, then dearest" cannot both
// be true, so the second key would be unreachable.
const OPPOSITE: Partial<Record<SortOrder, SortOrder>> = {
  priceAsc: "priceDesc",
  priceDesc: "priceAsc",
};

export function SortFilter() {
  const [sortKeys, setSortKeys] = useAtom(sortKeysAtom);
  const active = useAtomValue(effectiveSortKeysAtom);
  return (
    <ModelSortMenu value={sortKeys} active={active} onChange={setSortKeys} />
  );
}

export function ModelSortMenu(props: {
  value: SortOrder[];
  active: readonly SortOrder[];
  onChange: (next: SortOrder[]) => void;
}) {
  const t = useTranslations();
  return (
    <SortMenu
      options={SORT_VALUES}
      label={(key) => t(LABEL_KEY[key])}
      opposite={OPPOSITE}
      value={props.value}
      active={props.active}
      onChange={props.onChange}
    />
  );
}

// `value` is what the user picked; `active` adds the fallback when it is empty.
export function SortMenu<K extends string>(props: {
  options: readonly K[];
  label: (key: K) => string;
  opposite?: Partial<Record<K, K>>;
  value: K[];
  active: readonly K[];
  onChange: (next: K[]) => void;
}) {
  const t = useTranslations();
  const sortKeys = props.value;
  const active = props.active;
  const setSortKeys = props.onChange;
  const label = props.label;

  const summary =
    active.length > 1
      ? t("MODELS.SORT.MULTI", {
          first: label(active[0]),
          count: active.length - 1,
        })
      : active[0] !== undefined
        ? label(active[0])
        : t("MODELS.SORT.HINT");

  function toggle(key: K) {
    const at = sortKeys.indexOf(key);
    if (at >= 0) {
      setSortKeys(sortKeys.filter((k) => k !== key));
      return;
    }
    const opposite = props.opposite?.[key];
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
            <span>{summary}</span>
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-60">
        <p className="text-muted-foreground px-2 py-1.5 text-xs">
          {t("MODELS.SORT.HINT")}
        </p>
        <DropdownMenuSeparator />
        {props.options.map((key) => {
          const rank = sortKeys.indexOf(key);
          return (
            <DropdownMenuItem
              key={key}
              closeOnClick={false}
              onClick={() => toggle(key)}
              className="flex items-center justify-between gap-2"
            >
              <span>{label(key)}</span>
              {rank >= 0 && (
                // The menu item forces text-accent-foreground onto every descendant while
                // focused, erasing this number against its own background.
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
