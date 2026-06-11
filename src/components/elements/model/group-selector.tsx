"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { buildGroupEntries } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const AUTO = "auto";

type GroupSelectorProps = {
  value: string | null; // null == auto
  onChange: (group: string | null) => void;
  model: string | null;
};

export function GroupSelector(props: GroupSelectorProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const pricingQuery = usePricingQuery();
  const authQuery = useAuthQuery();

  const pricingData = pricingQuery.data;
  const groupRatioMap = pricingData?.groupRatioMap ?? {};
  const selectedModel = pricingData?.models.find(
    (m) => m.name === props.model,
  );
  const enableGroups = selectedModel?.enableGroups ?? [];
  // Empty enableGroups = all groups allowed; fall back to every priced group.
  const sourceGroups =
    enableGroups.length > 0 ? enableGroups : Object.keys(groupRatioMap);
  const entries = buildGroupEntries(sourceGroups, groupRatioMap);

  // Reset to auto when the new model no longer supports the picked group.
  useEffect(() => {
    if (!props.value || props.value === AUTO) return;
    if (enableGroups.length > 0 && !enableGroups.includes(props.value)) {
      props.onChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on model change
  }, [props.model]);

  // Group billing applies to the user's own token; guests run the shared key.
  if (!authQuery.data) return null;

  const selectedEntry = props.value
    ? entries.find((e) => e.group === props.value)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        data-testid="group-selector-trigger"
        data-group={props.value || AUTO}
        className="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground flex h-8 w-full items-center justify-between rounded-md border px-3 text-xs"
      >
        <span className="truncate font-mono">
          {props.value ? props.value : t("CHAT.GROUP.AUTO")}
          {selectedEntry && (
            <span className="text-muted-foreground ml-1.5">
              {selectedEntry.ratio}x
            </span>
          )}
        </span>
        <Icon
          name="chevrons-up-down"
          className="text-muted-foreground ml-2 h-3.5 w-3.5 shrink-0"
        />
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1rem)] p-0 sm:w-64" align="start">
        <Command>
          <CommandList>
            <CommandEmpty>{t("CHAT.GROUP.NO_RESULTS")}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={AUTO}
                data-group={AUTO}
                data-checked={!props.value || undefined}
                onSelect={() => {
                  props.onChange(null);
                  setOpen(false);
                }}
                className="text-xs"
              >
                <span className="min-w-0 flex-1 font-mono">
                  {t("CHAT.GROUP.AUTO")}
                </span>
                {!props.value && (
                  <Icon name="check" className="h-3.5 w-3.5 shrink-0" />
                )}
              </CommandItem>
              {entries.map((entry) => {
                const disabled =
                  enableGroups.length > 0 &&
                  !enableGroups.includes(entry.group);
                return (
                  <CommandItem
                    key={entry.group}
                    value={entry.group}
                    data-group={entry.group}
                    data-checked={entry.group === props.value || undefined}
                    onSelect={() => {
                      if (disabled) return;
                      props.onChange(entry.group);
                      setOpen(false);
                    }}
                    className={cn("text-xs", disabled && "opacity-50")}
                  >
                    <span className="min-w-0 flex-1 font-mono">
                      {entry.group}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {entry.ratio}x
                    </span>
                    {entry.group === props.value && (
                      <Icon name="check" className="h-3.5 w-3.5 shrink-0" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
