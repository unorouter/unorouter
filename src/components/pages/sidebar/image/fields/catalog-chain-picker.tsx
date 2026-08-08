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
import { cn } from "@/lib/utils";
import { formatTokens } from "@/lib/utils/format/number";
import { useTranslations } from "next-intl";

export type WeightedEntry = { name: string; weight: number };

type CatalogItem = {
  id: string;
  air: string;
  name: string;
  category?: string | null;
  architecture?: string | null;
  heroImage?: string | null;
  triggerWords?: string | null;
  tags?: string[];
  downloadCount?: number | null;
  thumbsUpCount?: number | null;
};

type Props<TItem extends CatalogItem, TEntry extends WeightedEntry> = {
  titleKey: TranslationKey;
  emptyKey: TranslationKey;
  items: TItem[];
  isLoading: boolean;
  /** A search is in flight while PREVIOUS results are still on screen. Distinct from
   *  isLoading, which is only true when there is nothing to show at all. */
  isFetching?: boolean;
  value: TEntry[];
  onAddPayload: (item: TItem) => TEntry;
  onChange: (next: TEntry[]) => void;
  /** Present = show a search box. The catalog holds tens of thousands of entries, so the
   *  default page of 24 is a lottery without one. Owned by the caller since it drives the
   *  query. */
  search?: string;
  onSearchChange?: (next: string) => void;
};

export function CatalogChainPicker<
  TItem extends CatalogItem,
  TEntry extends WeightedEntry,
>(props: Props<TItem, TEntry>) {
  const t = useTranslations();
  const value = props.value;
  const selected = new Set(value.map((e) => e.name));
  const available = props.items.filter((it) => !selected.has(it.air));

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
          {/* The result area is a FIXED height rather than one that grows with the list. The
              popup repositions whenever its size changes, so a list that swapped between a
              one-line "searching" state and 24 rows with async-loading thumbnails made the
              whole panel jump on every keystroke and drift out from under the cursor. A
              constant box means only the contents scroll. */}
          <PopoverContent className="flex w-80 flex-col p-0" align="start">
            {props.onSearchChange && (
              <div className="border-b p-2">
                <div className="relative">
                  <Input
                    autoFocus
                    value={props.search ?? ""}
                    placeholder={t("IMAGE.CATALOG_SEARCH_PLACEHOLDER")}
                    onChange={(e) => props.onSearchChange?.(e.target.value)}
                  />
                  {/* The provider answers in 8 to 22 seconds and the previous results stay on
                      screen meanwhile, so without a visible pending marker the box looks like
                      it is ignoring what was typed. */}
                  {props.isFetching ? (
                    <Icon
                      name="loader"
                      className="text-muted-foreground absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin"
                    />
                  ) : null}
                </div>
              </div>
            )}
            {/* Capped against the viewport as well as a fixed height: on a short screen a
                constant 20rem list is taller than the room the popup has, and it then spills
                past the edge rather than scrolling internally. */}
            <div className="h-[min(20rem,50dvh)] overflow-y-auto">
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
                <div
                  className={cn(
                    "flex flex-col py-2",
                    // Rows on screen during a fetch belong to the PREVIOUS search term.
                    props.isFetching && "opacity-50",
                  )}
                >
                  {available.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="hover:bg-muted flex w-full items-start gap-2 px-3 py-2 text-left"
                      onClick={() =>
                        props.onChange([...value, props.onAddPayload(item)])
                      }
                    >
                      {/* Catalog names are frequently unreadable on their own, so the preview
                        carries most of what tells a user what a model does. */}
                      {item.heroImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.heroImage}
                          alt=""
                          loading="lazy"
                          className="bg-muted size-12 shrink-0 rounded object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {item.name}
                        </div>
                        {item.tags?.length ? (
                          <div className="text-muted-foreground truncate text-[11px]">
                            {item.tags.join(", ")}
                          </div>
                        ) : null}
                        {/* A LoRA with a trigger word does nothing until that word is in the
                          prompt, so it is the single most load-bearing thing to show. */}
                        {item.triggerWords ? (
                          <div className="text-primary truncate text-[11px]">
                            {t("IMAGE.TRIGGER_WORDS")}: {item.triggerWords}
                          </div>
                        ) : null}
                        <div className="text-muted-foreground mt-0.5 flex flex-wrap gap-2 text-[10px] tracking-wide uppercase">
                          <span>{item.architecture}</span>
                          {typeof item.downloadCount === "number" &&
                          item.downloadCount > 0 ? (
                            <span>
                              {formatTokens(item.downloadCount)}{" "}
                              {t("IMAGE.DOWNLOADS")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </FormItem>
  );
}

// Runware names architectures differently from the descriptor families, and a LoRA only
// applies to a matching architecture, so the picker narrows its search by this.
export function familyToArchitecture(
  family: "sdxl" | "flux2" | "sync-image" | "edit",
): string | undefined {
  if (family === "sdxl") return "sdxl";
  if (family === "flux2") return "flux1d";
  return undefined;
}
