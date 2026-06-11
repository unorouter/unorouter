"use client";

import { pick } from "@/lib/utils/base";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { Icon } from "@/components/ui/icon";
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
import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { analytics } from "@/lib/analytics";
import { buildGroupEntries, groupDisplayLabel } from "@/lib/api/pricing";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { setCookie } from "cookies-next";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const AUTO_GROUP = "auto";

type ModelSelectorProps = {
  value: string | null;
  onChange: (model: string) => void;
  // Nested billing-group control (null == auto). Group bar hidden for guests.
  group: string | null;
  onGroupChange: (group: string | null) => void;
};

export function ModelSelector(props: ModelSelectorProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const pricingQuery = usePricingQuery();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const pricingData = pricingQuery.data;
  const models = pricingData?.models ?? [];
  const modelsByType = pricingData?.modelsByType ?? [];

  const selected = models.find((m) => m.name === props.value);

  // Nested group control: groups the selected model supports + their ratios.
  const groupRatioMap = pricingData?.groupRatioMap ?? {};
  const enableGroups = selected?.enableGroups ?? [];
  // Empty enableGroups = all priced groups allowed.
  const groupEntries = buildGroupEntries(
    enableGroups.length > 0 ? enableGroups : Object.keys(groupRatioMap),
    groupRatioMap,
  );
  const selectedGroupEntry = props.group
    ? groupEntries.find((e) => e.group === props.group)
    : null;

  // Reset group to auto when the new model no longer supports the picked one.
  useEffect(() => {
    if (!props.group || props.group === AUTO_GROUP) return;
    if (enableGroups.length > 0 && !enableGroups.includes(props.group)) {
      props.onGroupChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on model change
  }, [props.value]);

  // Auto-select a random free model (text preferred) when none is selected,
  // or when the current pick isn't usable (guests can't use paid models).
  useEffect(() => {
    if (models.length === 0) return;
    const current = models.find((m) => m.name === props.value);
    if (current && (isLoggedIn || current.isFree)) return;

    const freeText = models.filter((m) => m.isFree && m.type === "text");
    const pool =
      freeText.length > 0 ? freeText : models.filter((m) => m.isFree);
    if (pool.length === 0) return;
    const chosen = pick(pool);
    props.onChange(chosen.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on login state or models list changes
  }, [isLoggedIn, models.length]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTypeFilter(null);
      }}
    >
      <PopoverTrigger
        data-testid="model-selector-trigger"
        data-model={props.value || undefined}
        className="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground flex h-8 w-full items-center justify-between rounded-md border px-3 text-xs"
      >
        <div className="flex items-center gap-2 truncate">
          {selected && <VendorIcon vendor={selected.vendor.name} size={14} />}
          <span className="truncate font-mono">
            {props.value || t("CHAT.MODEL.SELECT")}
          </span>
          {selected?.isFree && (
            <span className="rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] leading-none font-medium text-emerald-700 dark:text-emerald-300">
              {t("CHAT.MODEL.FREE_BADGE")}
            </span>
          )}
        </div>
        <Icon
          name="chevrons-up-down"
          className="text-muted-foreground ml-2 h-3.5 w-3.5 shrink-0"
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-1rem)] p-0 sm:w-96"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={t("CHAT.MODEL.SEARCH")}
            className="h-8 text-xs"
          />
          {modelsByType.length > 1 && (
            <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5">
              <Badge
                variant={typeFilter === null ? "default" : "outline"}
                data-testid="model-type-filter-all"
                className="cursor-pointer text-[10px]"
                onClick={() => setTypeFilter(null)}
              >
                {t("CHAT.FILTER_ALL")}
              </Badge>
              {modelsByType.map(({ tag }) => (
                <Badge
                  key={tag}
                  variant={typeFilter === tag ? "default" : "outline"}
                  data-testid={`model-type-filter-${tag}`}
                  className="cursor-pointer text-[10px]"
                  onClick={() => setTypeFilter(typeFilter === tag ? null : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <CommandList>
            <CommandEmpty>{t("CHAT.MODEL.NO_RESULTS")}</CommandEmpty>
            {(typeFilter
              ? modelsByType.filter(({ tag }) => tag === typeFilter)
              : modelsByType
            ).map(({ tag, models: tagModels }) => (
              <CommandGroup key={tag} heading={tag}>
                {tagModels.map((model) => {
                  const disabled = !isLoggedIn && !model.isFree;
                  return (
                    <CommandItem
                      key={model.name}
                      value={model.name}
                      keywords={[
                        model.vendor.name,
                        ...(model.isFree ? ["free"] : []),
                      ]}
                      data-testid={`model-option-${model.name}`}
                      data-model={model.name}
                      data-model-type={model.type}
                      data-free={model.isFree || undefined}
                      data-checked={model.name === props.value || undefined}
                      onSelect={() => {
                        if (disabled) {
                          setCookie(AUTH_REDIRECT_COOKIE, pathname, {
                            maxAge: 300,
                          });
                          router.push("/login");
                          setOpen(false);
                          return;
                        }
                        analytics.chat.modelChanged({
                          from: props.value,
                          to: model.name,
                        });
                        props.onChange(model.name);
                        setOpen(false);
                      }}
                      className={cn(
                        "text-xs",
                        disabled && "cursor-pointer opacity-50",
                      )}
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
                      {disabled && (
                        <span
                          className="text-muted-foreground shrink-0"
                          title={t("CHAT.MODEL.LOGIN_REQUIRED")}
                        >
                          <Icon name="lock" className="h-3 w-3" />
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
          {isLoggedIn && groupEntries.length > 0 && (
            <Popover open={groupOpen} onOpenChange={setGroupOpen}>
              <PopoverTrigger
                data-testid="group-submenu-trigger"
                data-group={props.group || "auto"}
                className="hover:bg-accent flex w-full items-center justify-between border-t px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground">
                  {t("CHAT.GROUP.SELECT")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="truncate font-mono text-xs">
                    {props.group
                      ? groupDisplayLabel(props.group, props.value)
                      : t("CHAT.GROUP.AUTO")}
                    {selectedGroupEntry && (
                      <span className="text-muted-foreground ml-1">
                        {selectedGroupEntry.ratio}x
                      </span>
                    )}
                  </span>
                  <Icon
                    name="chevron-right"
                    className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                  />
                </span>
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={4}
                className="w-60 gap-0 p-1"
              >
                <button
                  type="button"
                  data-testid="group-option-auto"
                  data-group="auto"
                  data-checked={!props.group || undefined}
                  onClick={() => {
                    props.onGroupChange(null);
                    setGroupOpen(false);
                  }}
                  className="hover:bg-accent flex w-full items-center justify-between rounded px-2 py-1.5 text-xs"
                >
                  <span className="font-mono">{t("CHAT.GROUP.AUTO")}</span>
                  {!props.group && (
                    <Icon name="check" className="h-3.5 w-3.5" />
                  )}
                </button>
                {groupEntries.map((entry) => {
                  const groupDisabled =
                    enableGroups.length > 0 &&
                    !enableGroups.includes(entry.group);
                  return (
                    <button
                      key={entry.group}
                      type="button"
                      disabled={groupDisabled}
                      data-testid={`group-option-${entry.group}`}
                      data-group={entry.group}
                      data-checked={entry.group === props.group || undefined}
                      onClick={() => {
                        props.onGroupChange(entry.group);
                        setGroupOpen(false);
                      }}
                      className={cn(
                        "hover:bg-accent flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-xs",
                        groupDisabled &&
                          "pointer-events-none opacity-40 hover:bg-transparent",
                      )}
                    >
                      <span
                        className="min-w-0 flex-1 truncate text-left font-mono"
                        title={entry.group}
                      >
                        {groupDisplayLabel(entry.group, props.value)}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="text-muted-foreground">
                          {entry.ratio}x
                        </span>
                        {entry.group === props.group && (
                          <Icon name="check" className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
