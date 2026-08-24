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
import { FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCustomProvidersQuery } from "@/hooks/ai/custom-providers-hook";
import {
  useImageModelsQuery,
  useModelGroupsQuery,
  usePricingCatalogQuery,
} from "@/hooks/models/pricing-hook";
import {
  isCustomModelId,
  makeCustomModelId,
} from "@/lib/ai/chat/custom-provider-id";
import {
  buildGroupEntries,
  type GroupEntry,
  groupDisplayLabel,
} from "@/lib/api/pricing";
import {
  AUTO_GROUP,
  NONE_VALUE,
  type TranslationKey,
} from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { logChatDebug } from "@/lib/utils/chat-debug-log";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

type ModelOption = { id: string; name: string };

export function ModelIdPicker(props: {
  value: string;
  onPick: (id: string) => void;
  customOptions: ModelOption[];
  catalogModels: { model_name: string; is_free: boolean; vendor: string }[];
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const customName = props.customOptions.find(
    (o) => o.id === props.value,
  )?.name;

  function pick(id: string) {
    props.onPick(id);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className="border-input bg-background hover:bg-accent hover:text-accent-foreground flex h-8 w-full items-center justify-between rounded-md border px-3 text-xs"
      >
        <span
          className={cn(
            "truncate",
            props.value === NONE_VALUE ? "text-muted-foreground" : "font-mono",
          )}
        >
          {props.value === NONE_VALUE
            ? t("CHAT.OVERRIDES.UTILITY_MODEL_PLACEHOLDER")
            : (customName ?? props.value)}
        </span>
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
          <CommandList>
            <CommandEmpty>{t("CHAT.MODEL.NO_RESULTS")}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={NONE_VALUE}
                onSelect={() => pick(NONE_VALUE)}
                className="text-xs"
              >
                {t("CHAT.OVERRIDES.UTILITY_MODEL_PLACEHOLDER")}
              </CommandItem>
            </CommandGroup>
            {props.customOptions.length > 0 && (
              <CommandGroup heading={t("CHAT.MODEL.CUSTOM_PROVIDERS")}>
                {props.customOptions.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.id}
                    keywords={[o.name]}
                    onSelect={() => pick(o.id)}
                    className="text-xs"
                  >
                    <Icon name="server" className="h-3.5 w-3.5 shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-mono">
                      {o.name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandGroup>
              {props.catalogModels.map((m) => (
                <CommandItem
                  key={m.model_name}
                  value={m.model_name}
                  keywords={[m.vendor, ...(m.is_free ? ["free"] : [])]}
                  onSelect={() => pick(m.model_name)}
                  className="text-xs"
                >
                  <VendorIcon vendor={m.vendor} size={14} />
                  <span className="min-w-0 flex-1 truncate font-mono">
                    {m.model_name}
                  </span>
                  {m.is_free && (
                    <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] leading-none font-medium text-emerald-700 dark:text-emerald-300">
                      {t("CHAT.MODEL.FREE_BADGE")}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function GroupRow(props: {
  model: string;
  group: string;
  onGroupChange: (group: string) => void;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const pinned = props.group === AUTO_GROUP ? null : props.group;

  const groupsQuery = useModelGroupsQuery(props.model);
  const groupRatioMap = groupsQuery.data?.group_ratio ?? {};
  const enableGroups = groupsQuery.data?.enable_groups ?? [];
  const candidateGroups = enableGroups.length
    ? enableGroups
    : Object.keys(groupRatioMap);
  const groupEntries: GroupEntry[] = buildGroupEntries(
    candidateGroups,
    groupRatioMap,
  );
  const selectedEntry = pinned
    ? groupEntries.find((e) => e.group === pinned)
    : null;

  // Reset ONLY once the list has settled. The upstream group list is served from
  // a 5-minute cache, so a model transiently returns without lanes it will have
  // again seconds later, and resetting off that partial list deletes the pin
  // permanently for a condition that already resolved.
  const candidateGroupsKey = candidateGroups.join("|");
  const groupsSettled = groupsQuery.isSuccess && !groupsQuery.isFetching;
  useEffect(() => {
    if (!pinned || !groupsSettled) return;
    if (candidateGroups.length > 0 && !candidateGroups.includes(pinned)) {
      logChatDebug("group.pin_reset", {
        model: props.model,
        pin: pinned,
        candidateGroups,
        source: "preset",
      });
      props.onGroupChange(AUTO_GROUP);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-run on model or group-list change
  }, [props.model, pinned, groupsSettled, candidateGroupsKey]);

  if (groupEntries.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className="hover:bg-accent flex w-full items-center justify-between rounded-md px-1 py-1 text-xs"
      >
        <span className="text-muted-foreground">{t("CHAT.GROUP.SELECT")}</span>
        <span className="flex items-center gap-1.5">
          <span className="truncate font-mono text-xs">
            {pinned
              ? groupDisplayLabel(pinned, props.model)
              : t("CHAT.GROUP.AUTO")}
            {selectedEntry && (
              <span className="text-muted-foreground ml-1">
                {selectedEntry.ratio}x
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
        align="end"
        // A model can expose 20+ groups, which overflows the viewport and leaves
        // the cheapest ones unreachable.
        className="max-h-[min(20rem,var(--available-height,20rem))] w-60 gap-0 overflow-y-auto p-1"
      >
        <button
          type="button"
          onClick={() => {
            props.onGroupChange(AUTO_GROUP);
            setOpen(false);
          }}
          className="hover:bg-accent flex w-full items-center justify-between rounded px-2 py-1.5 text-xs"
        >
          <span className="font-mono">{t("CHAT.GROUP.AUTO")}</span>
          {!pinned && <Icon name="check" className="h-3.5 w-3.5" />}
        </button>
        {groupEntries.map((entry) => (
          <button
            key={entry.group}
            type="button"
            onClick={() => {
              props.onGroupChange(entry.group);
              setOpen(false);
            }}
            className="hover:bg-accent flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-xs"
          >
            <span
              className="min-w-0 flex-1 truncate text-left font-mono"
              title={entry.group}
            >
              {groupDisplayLabel(entry.group, props.model)}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="text-muted-foreground">{entry.ratio}x</span>
              {entry.group === pinned && (
                <Icon name="check" className="h-3.5 w-3.5" />
              )}
            </span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Serves utilityModel and titleModel: both pick one text model from the same
// catalogue, so they share the picker rather than duplicating it. groupName is
// optional because only presets pin a provider lane; the conversation drawer
// deliberately does not (see CLAUDE.md on the model-keyed navbar pin).
export function UtilityModelField<TForm extends FieldValues>(props: {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  groupName?: FieldPath<TForm>;
  labelKey: TranslationKey;
  hintKey?: TranslationKey;
}) {
  const t = useTranslations();
  const catalogQuery = usePricingCatalogQuery();
  const customProvidersQuery = useCustomProvidersQuery();
  const catalogModels = (catalogQuery.data?.models ?? []).filter(
    (m) => m.type === "text",
  );
  const customOptions = (customProvidersQuery.data ?? []).flatMap((provider) =>
    provider.models
      .filter((m) => m.type !== "image")
      .map((m) => ({
        id: makeCustomModelId(provider.id, m.key),
        name: `${provider.name} / ${m.label}`,
      })),
  );
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-muted-foreground text-xs">
            {t(props.labelKey)}
          </FormLabel>
          <ModelIdPicker
            value={field.value}
            onPick={field.onChange}
            customOptions={customOptions}
            catalogModels={catalogModels}
          />
          <ModelGroupField
            control={props.control}
            groupName={props.groupName}
            model={field.value}
          />
          {props.hintKey && (
            <p className="text-muted-foreground text-xs">{t(props.hintKey)}</p>
          )}
        </FormItem>
      )}
    />
  );
}

// A custom provider IS the endpoint, so it has no lanes to choose between, and
// an unset model has nothing to look them up by.
function ModelGroupField<TForm extends FieldValues>(props: {
  control: Control<TForm>;
  groupName?: FieldPath<TForm>;
  model: string;
}) {
  const groupName = props.groupName;
  if (!groupName) return null;
  if (!props.model || props.model === NONE_VALUE) return null;
  if (isCustomModelId(props.model)) return null;
  return (
    <FormField
      control={props.control}
      name={groupName}
      render={({ field }) => (
        <GroupRow
          model={props.model}
          group={field.value || AUTO_GROUP}
          onGroupChange={field.onChange}
        />
      )}
    />
  );
}

export function ImageModelField<TForm extends FieldValues>(props: {
  control: Control<TForm>;
  name: FieldPath<TForm>;
  groupName?: FieldPath<TForm>;
  labelKey: TranslationKey;
  hintKey?: TranslationKey;
}) {
  const t = useTranslations();
  const imageModels = useImageModelsQuery().data;
  const customProvidersQuery = useCustomProvidersQuery();
  const catalogModels = (imageModels ?? []).map((m) => ({
    model_name: m.model_name,
    is_free: m.is_free,
    vendor: m.vendor,
  }));
  const customOptions = (customProvidersQuery.data ?? []).flatMap((provider) =>
    provider.models
      .filter((m) => m.type === "image")
      .map((m) => ({
        id: makeCustomModelId(provider.id, m.key),
        name: `${provider.name} / ${m.label}`,
      })),
  );
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-muted-foreground text-xs">
            {t(props.labelKey)}
          </FormLabel>
          <ModelIdPicker
            value={field.value}
            onPick={field.onChange}
            customOptions={customOptions}
            catalogModels={catalogModels}
          />
          <ModelGroupField
            control={props.control}
            groupName={props.groupName}
            model={field.value}
          />
          {props.hintKey && (
            <p className="text-muted-foreground text-xs">{t(props.hintKey)}</p>
          )}
        </FormItem>
      )}
    />
  );
}
