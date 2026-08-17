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
import { useLoginRedirect } from "@/hooks/auth/use-login-redirect";
import type { ImageModelDescriptor } from "@/lib/ai/image/models";
import { dollarsToQuota, renderQuota } from "@/lib/config/constants";
import type { GenerateTab } from "../../image-nav";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useDebouncedValue } from "@/hooks/ui/use-debounced-value";
import {
  useCheckpointSearchQuery,
  useSavedImageModelsQuery,
} from "@/hooks/ai/image-catalog-hook";

export type CustomCheckpoint = {
  air: string;
  name: string;
  architecture: string | null;
  heroImage: string | null;
  nsfwLevel: number | null;
};

function isModelInTab(m: ImageModelDescriptor, tab: GenerateTab): boolean {
  if (!m.tabs) return tab === "text2img";
  return m.tabs.includes(tab);
}

type Props = {
  models: ImageModelDescriptor[];
  selected: ImageModelDescriptor;
  activeTab: GenerateTab;
  onSelect: (modelId: string) => void;
  /** Picking a checkpoint the catalog does not ship sets the passthrough model plus its AIR. */
  onSelectCustom: (checkpoint: CustomCheckpoint) => void;
  /** Shown instead of the descriptor name when a user-supplied checkpoint is selected. */
  customLabel?: string | null;
};

export function ModelPicker(props: Props) {
  const t = useTranslations();
  const loginRedirect = useLoginRedirect();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const savedModels = useSavedImageModelsQuery();
  const remoteSearch = useCheckpointSearchQuery(debouncedSearch);

  const pick = (m: ImageModelDescriptor, disabled: boolean) => {
    if (disabled) {
      loginRedirect();
      setOpen(false);
      return;
    }
    props.onSelect(m.id);
    setOpen(false);
  };

  const renderItem = (m: ImageModelDescriptor) => {
    const disabled = !isLoggedIn && !m.isFree;
    return (
      <CommandItem
        key={m.id}
        value={`${m.displayName} ${m.vendor ?? ""} ${m.id}`}
        onSelect={() => pick(m, disabled)}
        className={cn(disabled && "opacity-50")}
      >
        {m.vendor && <VendorIcon vendor={m.vendor} size={14} />}
        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
        {m.isFree ? (
          <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] leading-none font-medium text-emerald-700 dark:text-emerald-300">
            {t("IMAGE.FREE_BADGE")}
          </span>
        ) : (
          <span className="text-muted-foreground shrink-0 text-xs">
            {m.pricePerCall > 0
              ? renderQuota(dollarsToQuota(m.pricePerCall), 2)
              : t("IMAGE.PRICING_RATIO_BASED")}
          </span>
        )}
        {disabled && (
          <Icon
            name="lock"
            className="text-muted-foreground ml-1 h-3 w-3 shrink-0"
          />
        )}
      </CommandItem>
    );
  };

  const pickCheckpoint = (c: CustomCheckpoint) => {
    if (!isLoggedIn) {
      loginRedirect();
      setOpen(false);
      return;
    }
    props.onSelectCustom(c);
    setSearch("");
    setOpen(false);
  };

  const renderCheckpoint = (c: CustomCheckpoint) => (
    <CommandItem
      key={c.air}
      value={`${c.name} ${c.air}`}
      onSelect={() => pickCheckpoint(c)}
    >
      <span className="min-w-0 flex-1 truncate">{c.name}</span>
      {c.architecture && (
        <span className="text-muted-foreground shrink-0 text-[10px] uppercase">
          {c.architecture}
        </span>
      )}
    </CommandItem>
  );

  const saved = (savedModels.data ?? []) as CustomCheckpoint[];
  const found = (remoteSearch.data?.items ?? []) as CustomCheckpoint[];
  const savedAirs = new Set(saved.map((c) => c.air));
  // Saved models already have their own group, so a search hit that is already saved would
  // otherwise appear twice.
  const foundCheckpoints = found.filter((c) => !savedAirs.has(c.air));
  const savedCheckpoints = search.trim()
    ? saved.filter((c) =>
        `${c.name} ${c.air}`
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : saved;

  const needle = search.trim().toLowerCase();
  const matchesSearch = (m: ImageModelDescriptor) =>
    !needle ||
    `${m.displayName} ${m.vendor ?? ""} ${m.id}`.toLowerCase().includes(needle);

  const hostedModels = props.models
    .filter((m) => isModelInTab(m, props.activeTab))
    .filter(matchesSearch);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          {props.selected.vendor && (
            <VendorIcon vendor={props.selected.vendor} size={16} />
          )}
          <span className="truncate">
            {props.customLabel ?? props.selected.displayName}
          </span>
        </span>
        <Icon
          name="chevrons-up-down"
          className="text-muted-foreground ml-2 h-4 w-4 shrink-0"
        />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("IMAGE.MODEL_SEARCH_OR_URL")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t("IMAGE.MODEL_NO_RESULTS")}</CommandEmpty>
            {savedCheckpoints.length > 0 && (
              <CommandGroup heading={t("IMAGE.MODEL_GROUP_SAVED")}>
                {savedCheckpoints.map(renderCheckpoint)}
              </CommandGroup>
            )}
            {hostedModels.length > 0 && (
              <CommandGroup heading={t("IMAGE.MODEL_GROUP_HOSTED")}>
                {hostedModels.map(renderItem)}
              </CommandGroup>
            )}
            {foundCheckpoints.length > 0 && (
              <CommandGroup heading={t("IMAGE.MODEL_GROUP_CIVITAI")}>
                {foundCheckpoints.map(renderCheckpoint)}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
