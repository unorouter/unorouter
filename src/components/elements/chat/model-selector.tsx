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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuthQuery } from "@/hooks/auth-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { setCookie } from "cookies-next";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LuChevronsUpDown, LuLock } from "react-icons/lu";

type ModelSelectorProps = {
  value: string | null;
  onChange: (model: string) => void;
};

export function ModelSelector(props: ModelSelectorProps) {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const pricingQuery = usePricingQuery();
  const authQuery = useAuthQuery();
  const isLoggedIn = !!authQuery.data;
  const pricingData = pricingQuery.data;
  const models = pricingData?.models ?? [];
  const modelsByType = pricingData?.modelsByType ?? [];
  const firstFreeModel = pricingData?.firstFreeModel ?? null;

  const selected = models.find((m) => m.name === props.value);

  // Auto-select first free text model when not logged in and current selection is invalid
  useEffect(() => {
    if (isLoggedIn || !firstFreeModel) return;
    const current = models.find((m) => m.name === props.value);
    if (current?.isFree) return;
    props.onChange(firstFreeModel.name);
  }, [isLoggedIn, firstFreeModel?.name]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTypeFilter(null);
      }}
    >
      <PopoverTrigger className="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground flex h-8 w-full items-center justify-between rounded-md border px-3 text-xs">
        <div className="flex items-center gap-2 truncate">
          {selected && (
            <VendorIcon vendor={selected.vendor.name} size={14} />
          )}
          <span className="truncate font-mono">
            {props.value || t("CHAT.SELECT_MODEL")}
          </span>
          {selected?.isFree && (
            <span className="bg-emerald-500/15 text-emerald-500 rounded px-1 py-0.5 text-[10px] font-medium leading-none">
              {t("CHAT.FREE_MODEL_BADGE")}
            </span>
          )}
        </div>
        <LuChevronsUpDown className="text-muted-foreground ml-2 h-3.5 w-3.5 shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput
            placeholder={t("CHAT.SEARCH_MODEL")}
            className="h-8 text-xs"
          />
          {modelsByType.length > 1 && (
            <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5">
              <Badge
                variant={typeFilter === null ? "default" : "outline"}
                className="cursor-pointer text-[10px]"
                onClick={() => setTypeFilter(null)}
              >
                {t("CHAT.FILTER_ALL")}
              </Badge>
              {modelsByType.map(({ tag }) => (
                <Badge
                  key={tag}
                  variant={typeFilter === tag ? "default" : "outline"}
                  className="cursor-pointer text-[10px]"
                  onClick={() =>
                    setTypeFilter(typeFilter === tag ? null : tag)
                  }
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          <CommandList>
            <CommandEmpty>{t("CHAT.NO_MODELS_FOUND")}</CommandEmpty>
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
                      data-checked={model.name === props.value || undefined}
                      onSelect={() => {
                        if (disabled) {
                          setCookie(AUTH_REDIRECT_COOKIE, pathname, { maxAge: 300 });
                          router.push("/login");
                          setOpen(false);
                          return;
                        }
                        props.onChange(model.name);
                        setOpen(false);
                      }}
                      className={cn(
                        "text-xs",
                        disabled && "opacity-50 cursor-pointer",
                      )}
                    >
                      <VendorIcon vendor={model.vendor.name} size={14} />
                      <span className="min-w-0 flex-1 font-mono">
                        {model.name}
                      </span>
                      {model.isFree && (
                        <span className="bg-emerald-500/15 text-emerald-500 shrink-0 rounded px-1 py-0.5 text-[10px] font-medium leading-none">
                          {t("CHAT.FREE_MODEL_BADGE")}
                        </span>
                      )}
                      {disabled && (
                        <span className="text-muted-foreground shrink-0" title={t("CHAT.LOGIN_TO_USE_MODEL")}>
                          <LuLock className="h-3 w-3" />
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
