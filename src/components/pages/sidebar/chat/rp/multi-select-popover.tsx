"use client";

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
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Check, PlusCircle } from "lucide-react";

type Option = { id: string; label: string };

type Props = {
  options: Option[];
  value: string[];
  onChange: (next: string[]) => void;
  triggerLabel: string;
  searchPlaceholder: string;
  emptyText: string;
};

/**
 * Generic multi-select popover modeled on the models-page vendor filter.
 * Trigger button shows up to two selected labels as badges, then collapses
 * to a count. The popover renders a searchable checkbox list plus a Clear
 * action.
 */
export function MultiSelectPopover(props: Props) {
  const t = useTranslations();
  const selectedSet = new Set(props.value);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full justify-start border-dashed"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            <span className="truncate">{props.triggerLabel}</span>
            {props.value.length > 0 && (
              <>
                <Separator orientation="vertical" className="mx-1.5 h-4" />
                <div className="flex gap-1">
                  {props.value.length > 2 ? (
                    <Badge
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {props.value.length} {t("CHAT.OVERRIDES.SELECTED")}
                    </Badge>
                  ) : (
                    props.options
                      .filter((o) => selectedSet.has(o.id))
                      .map((o) => (
                        <Badge
                          key={o.id}
                          variant="secondary"
                          className="rounded-sm px-1 font-normal"
                        >
                          {o.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-[260px] p-0" align="start">
        <Command>
          <CommandInput placeholder={props.searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{props.emptyText}</CommandEmpty>
            <CommandGroup>
              {props.options.map((option) => {
                const isSelected = selectedSet.has(option.id);
                return (
                  <CommandItem
                    key={option.id}
                    onSelect={() => {
                      const next = isSelected
                        ? props.value.filter((v) => v !== option.id)
                        : [...props.value, option.id];
                      props.onChange(next);
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
                    <span className="truncate text-sm">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {props.value.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => props.onChange([])}
                    className="justify-center text-center"
                  >
                    {t("CHAT.OVERRIDES.CLEAR")}
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
