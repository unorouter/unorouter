"use client";

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
import { useCustomProvidersQuery } from "@/hooks/ai/custom-providers-hook";
import { analytics } from "@/lib/analytics";
import {
  buildGroupEntries,
  type GroupEntry,
  groupDisplayLabel,
  groupModelsByType,
} from "@/lib/api/pricing";
import {
  makeCustomModelId,
  parseCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import { usePricingCatalogQuery } from "@/hooks/models/pricing-hook";
import {
  type ModelStatusInfo,
  useModelStatusMap,
} from "@/hooks/models/model-status-hook";
import { UptimeDot } from "@/components/elements/model/uptime-dot";
import { useLoginRedirect } from "@/hooks/auth/use-login-redirect";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const AUTO_GROUP = "auto";

type ModelSelectorProps = {
  value: string | null;
  onChange: (model: string) => void;
  group: string | null;
  onGroupChange: (group: string | null) => void;
};

type CustomProvider = NonNullable<
  ReturnType<typeof useCustomProvidersQuery>["data"]
>[number];

function FreeBadge(props: { label: string; shrink?: boolean }) {
  return (
    <span
      className={cn(
        "rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] leading-none font-medium text-emerald-700 dark:text-emerald-300",
        props.shrink && "shrink-0",
      )}
    >
      {props.label}
    </span>
  );
}

export function TypeFilterBadges(props: {
  tags: string[];
  typeFilter: string | null;
  onFilterChange: (tag: string | null) => void;
}) {
  const t = useTranslations();
  return (
    <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5">
      <Badge
        variant={props.typeFilter === null ? "default" : "outline"}
        data-testid="model-type-filter-all"
        className="cursor-pointer text-[10px]"
        onClick={() => props.onFilterChange(null)}
      >
        {t("CHAT.FILTER_ALL")}
      </Badge>
      {props.tags.map((tag) => (
        <Badge
          key={tag}
          variant={props.typeFilter === tag ? "default" : "outline"}
          data-testid={`model-type-filter-${tag}`}
          className="cursor-pointer text-[10px]"
          onClick={() =>
            props.onFilterChange(props.typeFilter === tag ? null : tag)
          }
        >
          {tag}
        </Badge>
      ))}
    </div>
  );
}

type CatalogModel = {
  name: string;
  vendor: string;
  isFree: boolean;
  type: string;
};

function CatalogModelItem(props: {
  model: CatalogModel;
  checked: boolean;
  disabled: boolean;
  status?: ModelStatusInfo;
  onPick: () => void;
  onLoginRedirect: () => void;
}) {
  const t = useTranslations();
  const model = props.model;
  return (
    <CommandItem
      value={model.name}
      keywords={[model.vendor, ...(model.isFree ? ["free"] : [])]}
      data-testid={`model-option-${model.name}`}
      data-model={model.name}
      data-model-type={model.type}
      data-free={model.isFree || undefined}
      data-checked={props.checked || undefined}
      onSelect={() => {
        if (props.disabled) {
          props.onLoginRedirect();
          return;
        }
        props.onPick();
      }}
      className={cn("text-xs", props.disabled && "cursor-pointer opacity-50")}
    >
      <VendorIcon vendor={model.vendor} size={14} />
      <span className="min-w-0 flex-1 font-mono">{model.name}</span>
      <UptimeDot info={props.status} />
      {model.isFree && <FreeBadge label={t("CHAT.MODEL.FREE_BADGE")} shrink />}
      {props.disabled && (
        <span
          className="text-muted-foreground shrink-0"
          title={t("CHAT.MODEL.LOGIN_REQUIRED")}
        >
          <Icon name="lock" className="h-3 w-3" />
        </span>
      )}
    </CommandItem>
  );
}

function CustomProviderItems(props: {
  providers: CustomProvider[];
  value: string | null;
  onPick: (id: string) => void;
}) {
  const t = useTranslations();
  return (
    <CommandGroup heading={t("CHAT.MODEL.CUSTOM_PROVIDERS")}>
      {props.providers.flatMap((provider) =>
        (provider.models ?? [])
          .filter((model) => model.type !== "image")
          .map((model) => {
            const id = makeCustomModelId(provider.id, model.key);
            return (
              <CommandItem
                key={id}
                value={id}
                keywords={[provider.name, model.label, model.key]}
                data-testid={`model-option-${id}`}
                data-model={id}
                data-checked={id === props.value || undefined}
                onSelect={() => props.onPick(id)}
                className="text-xs"
              >
                <Icon name="server" className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate font-mono">
                  {provider.name} / {model.label}
                </span>
              </CommandItem>
            );
          }),
      )}
    </CommandGroup>
  );
}

function GroupSubmenu(props: {
  value: string | null;
  group: string | null;
  onGroupChange: (group: string | null) => void;
  groupEntries: GroupEntry[];
  enableGroups: string[];
}) {
  const t = useTranslations();
  const [groupOpen, setGroupOpen] = useState(false);
  const selectedGroupEntry = props.group
    ? props.groupEntries.find((e) => e.group === props.group)
    : null;

  return (
    <Popover open={groupOpen} onOpenChange={setGroupOpen}>
      <PopoverTrigger
        data-testid="group-submenu-trigger"
        data-group={props.group || "auto"}
        className="hover:bg-accent flex w-full items-center justify-between border-t px-3 py-2 text-xs"
      >
        <span className="text-muted-foreground">{t("CHAT.GROUP.SELECT")}</span>
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
          {!props.group && <Icon name="check" className="h-3.5 w-3.5" />}
        </button>
        {props.groupEntries.map((entry) => {
          const groupDisabled =
            props.enableGroups.length > 0 &&
            !props.enableGroups.includes(entry.group);
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
                <span className="text-muted-foreground">{entry.ratio}x</span>
                {entry.group === props.group && (
                  <Icon name="check" className="h-3.5 w-3.5" />
                )}
              </span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function ModelSelector(props: ModelSelectorProps) {
  const t = useTranslations();
  const loginRedirect = useLoginRedirect();
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const pricingQuery = usePricingCatalogQuery();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const pricingData = pricingQuery.data;
  const models = pricingData?.models ?? [];
  const modelsByType = groupModelsByType(models);
  const statusMap = useModelStatusMap();

  const customProvidersQuery = useCustomProvidersQuery();
  const customProviders = customProvidersQuery.data ?? [];

  const selected = models.find((m) => m.name === props.value);
  const selectedCustom = props.value ? parseCustomModelId(props.value) : null;
  const selectedCustomProvider = selectedCustom
    ? customProviders.find((p) => p.id === selectedCustom.providerId)
    : undefined;
  const selectedCustomLabel = selectedCustom
    ? ((selectedCustomProvider?.models ?? []).find(
        (m) => m.key === selectedCustom.modelKey,
      )?.label ?? selectedCustom.modelKey)
    : null;
  const triggerLabel = selectedCustomProvider
    ? `${selectedCustomProvider.name} / ${selectedCustomLabel}`
    : props.value || t("CHAT.MODEL.SELECT");
  const selectedUnavailable =
    !!props.value && !selected && !selectedCustom && pricingQuery.isSuccess;

  const groupRatioMap: Record<string, number> = {
    ...pricingData?.groupRatioMap,
  };
  const enableGroups = selected?.enableGroups ?? [];
  const candidateGroups = enableGroups.length
    ? enableGroups
    : Object.keys(groupRatioMap);
  const groupEntries = buildGroupEntries(candidateGroups, groupRatioMap);

  // A pinned group must exist among the model's servable groups or new-api
  // silently falls back
  // to auto while the UI still claims the pin. Reset to auto when the loaded
  // group list does not contain the pin; skip while the list is still empty
  // (pricing not loaded yet) so a valid pin is never wiped by a race.
  const candidateGroupsKey = candidateGroups.join("|");
  useEffect(() => {
    if (!props.group || props.group === AUTO_GROUP) return;
    if (candidateGroups.length > 0 && !candidateGroups.includes(props.group)) {
      props.onGroupChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run on model or group-list change
  }, [props.value, candidateGroupsKey]);

  function pickModel(id: string) {
    analytics.chat.modelChanged({ from: props.value, to: id });
    props.onChange(id);
    setOpen(false);
  }

  function redirectToLogin() {
    loginRedirect();
    setOpen(false);
  }

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
          {selected && <VendorIcon vendor={selected.vendor} size={14} />}
          {selectedCustomProvider && (
            <Icon name="server" className="h-3.5 w-3.5 shrink-0" />
          )}
          {selectedUnavailable && (
            <Icon
              name="circle-help"
              className="text-muted-foreground h-3.5 w-3.5 shrink-0"
            />
          )}
          <span className="truncate font-mono">{triggerLabel}</span>
          {selected?.isFree && <FreeBadge label={t("CHAT.MODEL.FREE_BADGE")} />}
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
            <TypeFilterBadges
              tags={modelsByType.map(({ tag }) => tag)}
              typeFilter={typeFilter}
              onFilterChange={setTypeFilter}
            />
          )}
          <CommandList>
            <CommandEmpty>{t("CHAT.MODEL.NO_RESULTS")}</CommandEmpty>
            {(typeFilter
              ? modelsByType.filter(({ tag }) => tag === typeFilter)
              : modelsByType
            ).map(({ tag, models: tagModels }) => (
              <CommandGroup key={tag} heading={tag}>
                {tagModels.map((model) => (
                  <CatalogModelItem
                    key={model.name}
                    model={model}
                    checked={model.name === props.value}
                    disabled={!isLoggedIn && !model.isFree}
                    status={statusMap.get(model.name)}
                    onPick={() => pickModel(model.name)}
                    onLoginRedirect={redirectToLogin}
                  />
                ))}
              </CommandGroup>
            ))}
            {customProviders.length > 0 && typeFilter === null && (
              <CustomProviderItems
                providers={customProviders}
                value={props.value}
                onPick={pickModel}
              />
            )}
          </CommandList>
          {/* Billing group routes via new-api's X-Group; custom models fire browser -> user endpoint and never
              hit new-api, so the group selector is meaningless for them. */}
          {isLoggedIn && groupEntries.length > 0 && !selectedCustom && (
            <GroupSubmenu
              value={props.value}
              group={props.group}
              onGroupChange={props.onGroupChange}
              groupEntries={groupEntries}
              enableGroups={enableGroups}
            />
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
