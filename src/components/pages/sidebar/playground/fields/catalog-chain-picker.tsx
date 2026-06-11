"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import type { TranslationKey } from "@/lib/types";
import { useTranslations } from "next-intl";

// Shared shape of a weighted chain entry (LoRA / embedding).
export type WeightedEntry = { name: string; weight: number };

// Minimum a catalog row must expose for this picker to render it.
type CatalogItem = {
  id: string;
  filename: string;
  name: string;
  description?: string | null;
  category?: string | null;
  baseModel?: string | null;
};

type Props<TItem extends CatalogItem, TEntry extends WeightedEntry> = {
  titleKey: TranslationKey;
  emptyKey: TranslationKey;
  items: TItem[];
  isLoading: boolean;
  value: TEntry[];
  // Builds a chain entry from a freshly-picked catalog item.
  onAddPayload: (item: TItem) => TEntry;
  onChange: (next: TEntry[]) => void;
};

// Generic weighted-entry list + catalog popover. Backs both the LoRA and
// embedding pickers; they differ only in catalog source and the add payload.
export function CatalogChainPicker<
  TItem extends CatalogItem,
  TEntry extends WeightedEntry,
>(props: Props<TItem, TEntry>) {
  const t = useTranslations();
  const value = props.value;
  const selected = new Set(value.map((e) => e.name));
  const available = props.items.filter((it) => !selected.has(it.filename));

  const onRemove = (idx: number) => {
    props.onChange(value.filter((_, j) => j !== idx));
  };
  const onWeight = (idx: number, weight: number) => {
    const next = [...value];
    next[idx] = { ...next[idx], weight };
    props.onChange(next);
  };

  return (
    <FormItem>
      <FormLabel>{t(props.titleKey)}</FormLabel>

      <div className="flex flex-col gap-3">
        {value.map((entry, i) => (
          <div
            key={`${entry.name}-${i}`}
            className="bg-muted/50 flex items-center gap-3 rounded-md p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{entry.name}</div>
              <div className="mt-1 flex items-center gap-2">
                <Slider
                  aria-label={t(props.titleKey)}
                  className="flex-1"
                  min={0}
                  max={2}
                  step={0.05}
                  value={[entry.weight]}
                  onValueChange={(v) =>
                    onWeight(i, Array.isArray(v) ? v[0] : v)
                  }
                />
                <Input
                  className="w-20"
                  type="number"
                  min={0}
                  max={2}
                  step={0.05}
                  value={entry.weight}
                  onChange={(e) => onWeight(i, Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onRemove(i)}
              title={t("IMAGE.DELETE")}
            >
              <Icon name="x" />
            </Button>
          </div>
        ))}

        <Popover>
          <PopoverTrigger className="bg-background hover:bg-accent inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm font-medium">
            <Icon name="plus" className="mr-2" />
            {t(props.titleKey)}
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            {props.isLoading && (
              <div className="text-muted-foreground p-4 text-sm">
                {t("IMAGE.STATUS_PENDING")}
              </div>
            )}
            {!props.isLoading && props.items.length === 0 && (
              <div className="text-muted-foreground p-4 text-sm">
                {t(props.emptyKey)}
              </div>
            )}
            {!props.isLoading &&
              props.items.length > 0 &&
              available.length === 0 && (
                <div className="text-muted-foreground p-4 text-sm">
                  {t("IMAGE.HISTORY_EMPTY")}
                </div>
              )}
            {available.length > 0 && (
              <div className="flex max-h-72 flex-col overflow-y-auto py-2">
                {available.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="hover:bg-muted flex flex-col items-start gap-0.5 px-3 py-2 text-left"
                    onClick={() =>
                      props.onChange([...value, props.onAddPayload(item)])
                    }
                  >
                    <div className="text-sm font-medium">{item.name}</div>
                    {item.description && (
                      <div className="text-muted-foreground line-clamp-2 text-xs">
                        {item.description}
                      </div>
                    )}
                    <div className="text-muted-foreground mt-0.5 flex gap-2 text-[10px] tracking-wide uppercase">
                      <span>{item.category}</span>
                      <span>{item.baseModel}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </FormItem>
  );
}

// Shared helper: model family to catalog baseModel filter.
export function familyToBaseModel(
  family: "sdxl" | "flux2" | "sync-image" | "edit",
): "sdxl" | "flux2" | undefined {
  if (family === "sdxl") return "sdxl";
  if (family === "flux2") return "flux2";
  return undefined;
}
