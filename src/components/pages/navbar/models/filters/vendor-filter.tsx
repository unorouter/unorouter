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
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { ProcessedModel } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { selectedVendorsAtom } from "@/store/models-store";
import { useAtom } from "jotai";
import { Check, PlusCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type VendorOption = {
  name: string;
  count: number;
};

export function VendorFilter(props: { models: ProcessedModel[] }) {
  const [selectedVendors, setSelectedVendors] = useAtom(selectedVendorsAtom);
  const t = useTranslations();

  const vendorOptions: VendorOption[] = props.models.reduce((acc, model) => {
    const existing = acc.find((v) => v.name === model.vendor.name);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ name: model.vendor.name, count: 1 });
    }
    return acc;
  }, [] as VendorOption[]);

  vendorOptions.sort((a, b) => b.count - a.count);

  const selectedSet = new Set(selectedVendors);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-dashed md:h-9"
          >
            <PlusCircle className="mr-1.5 h-4 w-4 md:mr-2" />
            <span>{t("MODELS.FILTER.PROVIDER_MULTI")}</span>
            {selectedVendors.length > 0 && (
              <>
                <Separator
                  orientation="vertical"
                  className="mx-1.5 h-4 md:mx-2"
                />
                <Badge
                  variant="secondary"
                  className="rounded-sm px-1 font-normal lg:hidden"
                >
                  {selectedVendors.length}
                </Badge>
                <div className="hidden space-x-1 lg:flex">
                  {selectedVendors.length > 2 ? (
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {selectedVendors.length} {t("MODELS.FILTER.SELECTED")}
                    </Badge>
                  ) : (
                    vendorOptions
                      .filter((option) => selectedSet.has(option.name))
                      .map((option) => (
                        <Badge
                          variant="secondary"
                          key={option.name}
                          className="rounded-sm px-1 font-normal"
                        >
                          {option.name}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("MODELS.FILTER.SEARCH_PROVIDERS")} />
          <CommandList>
            <CommandEmpty>{t("MODELS.FILTER.NO_PROVIDERS")}</CommandEmpty>
            <CommandGroup>
              {vendorOptions.map((option) => {
                const isSelected = selectedSet.has(option.name);
                return (
                  <CommandItem
                    key={option.name}
                    onSelect={() => {
                      const next = isSelected
                        ? selectedVendors.filter((v) => v !== option.name)
                        : [...selectedVendors, option.name];
                      setSelectedVendors(next);
                    }}
                    className="[&>svg]:hidden"
                  >
                    <div
                      className={cn(
                        "border-primary mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                        isSelected ? "bg-primary" : "opacity-50",
                      )}
                    >
                      <Check
                        className={cn(
                          "text-primary-foreground! h-4 w-4",
                          !isSelected && "invisible",
                        )}
                      />
                    </div>
                    <div className="flex flex-1 items-center gap-2">
                      <VendorIcon vendor={option.name} size={14} />
                      <span className="truncate font-mono text-xs">
                        {option.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-mono text-xs">
                      {option.count}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedVendors.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setSelectedVendors([])}
                    className="justify-center text-center"
                  >
                    {t("MODELS.FILTER.CLEAR")}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
