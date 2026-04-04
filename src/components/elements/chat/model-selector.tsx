"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LuChevronsUpDown } from "react-icons/lu";

type ModelSelectorProps = {
  value: string | null;
  onChange: (model: string) => void;
};

export function ModelSelector(props: ModelSelectorProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const pricingQuery = usePricingQuery();
  const rawModels = pricingQuery.data?.models ?? [];

  const allModels = rawModels.map((m) => ({
    name: m.name,
    vendorName:
      typeof m.vendor === "string" ? m.vendor : (m.vendor?.name ?? ""),
    tags: Array.isArray(m.tags)
      ? m.tags
      : String(m.tags)
          .split(",")
          .map((s) => s.trim()),
  }));

  const groupMap = new Map<string, typeof allModels>();
  for (const model of allModels) {
    const tag = model.tags[0] ?? "Other";
    const list = groupMap.get(tag);
    if (list) list.push(model);
    else groupMap.set(tag, [model]);
  }

  const selected = allModels.find((m) => m.name === props.value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground flex h-8 w-full items-center justify-between rounded-md border px-3 text-xs">
        <div className="flex items-center gap-2 truncate">
          {selected && <VendorIcon vendor={selected.vendorName} size={14} />}
          <span className="truncate font-mono">
            {props.value || t("CHAT.SELECT_MODEL")}
          </span>
        </div>
        <LuChevronsUpDown className="text-muted-foreground ml-2 h-3.5 w-3.5 shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t("CHAT.SEARCH_MODEL")}
            className="h-8 text-xs"
          />
          <CommandList>
            <CommandEmpty>{t("CHAT.NO_MODELS_FOUND")}</CommandEmpty>
            {[...groupMap].map(([tag, models]) => (
              <CommandGroup key={tag} heading={tag}>
                {models.map((model) => (
                  <CommandItem
                    key={model.name}
                    value={model.name}
                    data-checked={model.name === props.value || undefined}
                    onSelect={() => {
                      props.onChange(model.name);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <VendorIcon vendor={model.vendorName} size={14} />
                    <span className="font-mono">{model.name}</span>
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
