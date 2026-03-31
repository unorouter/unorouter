"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Button } from "@/components/ui/button";
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
import { LuCheck, LuChevronsUpDown } from "react-icons/lu";

type ModelSelectorProps = {
  value: string | null;
  onChange: (model: string) => void;
};

type GroupedModel = {
  name: string;
  vendorName: string;
  tags: string | string[];
};

type ModelGroup = {
  label: string;
  models: GroupedModel[];
};

export function ModelSelector(props: ModelSelectorProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const pricingQuery = usePricingQuery();
  const rawModels = pricingQuery.data?.models ?? [];

  // Normalize models for grouping
  const allModels: GroupedModel[] = rawModels.map((m) => ({
    name: m.name,
    vendorName:
      typeof m.vendor === "string" ? m.vendor : (m.vendor?.name ?? ""),
    tags: m.tags,
  }));

  const groups: ModelGroup[] = [];

  const textModels = allModels.filter(
    (m) => m.tags.includes("Text") || m.tags.includes("Reasoning"),
  );
  const imageModels = allModels.filter((m) => m.tags.includes("Image"));
  const videoModels = allModels.filter((m) => m.tags.includes("Video"));

  if (textModels.length > 0)
    groups.push({ label: t("CHAT.MODEL_GROUP_TEXT"), models: textModels });
  if (imageModels.length > 0)
    groups.push({ label: t("CHAT.MODEL_GROUP_IMAGE"), models: imageModels });
  if (videoModels.length > 0)
    groups.push({ label: t("CHAT.MODEL_GROUP_VIDEO"), models: videoModels });

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
            {groups.map((group) => (
              <CommandGroup key={group.label} heading={group.label}>
                {group.models.map((model) => (
                  <CommandItem
                    key={model.name}
                    value={model.name}
                    onSelect={() => {
                      props.onChange(model.name);
                      setOpen(false);
                    }}
                    className="text-xs"
                  >
                    <VendorIcon vendor={model.vendorName} size={14} />
                    <span className="font-mono">{model.name}</span>
                    {model.name === props.value && (
                      <LuCheck className="ml-auto h-3.5 w-3.5" />
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
