"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ProcessedModel } from "@/lib/api/pricing";
import { useTranslations } from "next-intl";
import { useState } from "react";

function groupByType(
  models: ProcessedModel[],
): { tag: string; models: ProcessedModel[] }[] {
  const map = new Map<string, ProcessedModel[]>();
  for (const m of models) {
    const tag = m.type || "text";
    const bucket = map.get(tag);
    if (bucket) bucket.push(m);
    else map.set(tag, [m]);
  }
  return [...map.entries()].map((entry) => ({
    tag: entry[0],
    models: entry[1],
  }));
}

export function ModelPicker(props: {
  models: ProcessedModel[];
  selected: string[];
  onAdd: (name: string) => void;
  variant?: "button" | "slot";
  label?: string;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const isSlot = props.variant === "slot";

  const available = props.models.filter(
    (m) => !props.selected.includes(m.name),
  );
  const byType = groupByType(available);
  const visible = typeFilter
    ? byType.filter((entry) => entry.tag === typeFilter)
    : byType;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTypeFilter(null);
      }}
    >
      <PopoverTrigger
        render={
          isSlot ? (
            <button
              type="button"
              className="border-border text-muted-foreground hover:border-primary/50 hover:text-foreground flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-sm transition-colors"
            >
              <Icon name="plus-circle" className="h-5 w-5" />
              {props.label ?? t("MODELS.COMPARE.SELECT_MODEL")}
            </button>
          ) : (
            <Button variant="outline" className="border-dashed">
              <Icon name="plus-circle" className="mr-2 h-4 w-4" />
              {t("MODELS.COMPARE.ADD_MODEL")}
            </Button>
          )
        }
      />
      <PopoverContent
        align="start"
        className="w-[calc(100vw-1rem)] p-0 sm:w-96"
      >
        <Command>
          <CommandInput
            placeholder={t("MODELS.SEARCH_PLACEHOLDER")}
            className="h-8 text-xs"
          />
          {byType.length > 1 && (
            <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5">
              <Badge
                variant={typeFilter === null ? "default" : "outline"}
                className="cursor-pointer text-[10px]"
                onClick={() => setTypeFilter(null)}
              >
                {t("CHAT.FILTER_ALL")}
              </Badge>
              {byType.map((entry) => (
                <Badge
                  key={entry.tag}
                  variant={typeFilter === entry.tag ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() =>
                    setTypeFilter(typeFilter === entry.tag ? null : entry.tag)
                  }
                >
                  {entry.tag}
                </Badge>
              ))}
            </div>
          )}
          <CommandList>
            <CommandEmpty>{t("MODELS.EMPTY")}</CommandEmpty>
            {visible.map((entry) => (
              <CommandGroup key={entry.tag} heading={entry.tag}>
                {entry.models.map((model) => (
                  <CommandItem
                    key={model.name}
                    value={model.name}
                    keywords={[
                      model.vendor.name,
                      ...(model.isFree ? ["free"] : []),
                    ]}
                    onSelect={() => {
                      props.onAdd(model.name);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <VendorIcon vendor={model.vendor.name} size={14} />
                    <span className="min-w-0 flex-1 font-mono">
                      {model.name}
                    </span>
                    {model.isFree && (
                      <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] leading-none font-medium text-emerald-700 dark:text-emerald-300">
                        {t("CHAT.MODEL.FREE_BADGE")}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
