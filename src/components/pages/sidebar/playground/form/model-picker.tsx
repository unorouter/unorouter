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
import { usePathname, useRouter } from "@/i18n/navigation";
import type { PlaygroundModelDescriptor } from "@/lib/ai/playground/models";
import {
  AUTH_REDIRECT_COOKIE,
  dollarsToQuota,
  renderQuota,
} from "@/lib/config/constants";
import type { GenerateTab } from "@/store/playground-store";
import { cn } from "@/lib/utils";
import { setCookie } from "cookies-next";
import { useTranslations } from "next-intl";
import { useState } from "react";

function isModelInTab(m: PlaygroundModelDescriptor, tab: GenerateTab): boolean {
  if (!m.tabs) return tab === "text2img";
  return m.tabs.includes(tab);
}

type Props = {
  models: PlaygroundModelDescriptor[];
  selected: PlaygroundModelDescriptor;
  activeTab: GenerateTab;
  onSelect: (modelId: string) => void;
};

export function ModelPicker(props: Props) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const [open, setOpen] = useState(false);

  const pick = (m: PlaygroundModelDescriptor, disabled: boolean) => {
    if (disabled) {
      setCookie(AUTH_REDIRECT_COOKIE, pathname, { maxAge: 300 });
      router.push("/login");
      setOpen(false);
      return;
    }
    props.onSelect(m.id);
    setOpen(false);
  };

  const renderItem = (m: PlaygroundModelDescriptor) => {
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

  const comfyModels = props.models
    .filter((m) => m.family !== "sync-image")
    .filter((m) => isModelInTab(m, props.activeTab));
  const hostedModels = props.models
    .filter((m) => m.family === "sync-image")
    .filter((m) => isModelInTab(m, props.activeTab));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground flex h-9 w-full items-center justify-between rounded-md border px-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          {props.selected.vendor && (
            <VendorIcon vendor={props.selected.vendor} size={16} />
          )}
          <span className="truncate">{props.selected.displayName}</span>
        </span>
        <Icon
          name="chevrons-up-down"
          className="text-muted-foreground ml-2 h-4 w-4 shrink-0"
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={t("IMAGE.MODEL_SEARCH")} />
          <CommandList>
            <CommandEmpty>{t("IMAGE.MODEL_NO_RESULTS")}</CommandEmpty>
            <CommandGroup heading={t("IMAGE.MODEL_GROUP_COMFYUI")}>
              {comfyModels.map(renderItem)}
            </CommandGroup>
            {hostedModels.length > 0 && (
              <CommandGroup heading={t("IMAGE.MODEL_GROUP_HOSTED")}>
                {hostedModels.map(renderItem)}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
