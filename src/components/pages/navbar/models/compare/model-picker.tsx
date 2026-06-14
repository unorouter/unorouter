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
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ProcessedModel } from "@/lib/api/pricing";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ModelPicker(props: {
  models: ProcessedModel[];
  selected: string[];
  onAdd: (name: string) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const available = props.models.filter(
    (m) => !props.selected.includes(m.name),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" className="border-dashed">
            <Icon name="plus-circle" className="mr-2 h-4 w-4" />
            {t("MODELS.COMPARE.ADD_MODEL")}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder={t("MODELS.SEARCH_PLACEHOLDER")} />
          <CommandList>
            <CommandEmpty>{t("MODELS.EMPTY")}</CommandEmpty>
            <CommandGroup>
              {available.map((m) => (
                <CommandItem
                  key={m.name}
                  value={m.name}
                  onSelect={() => {
                    props.onAdd(m.name);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <VendorIcon vendor={m.vendor.name} size={16} />
                  <span className="truncate font-mono text-sm">{m.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
