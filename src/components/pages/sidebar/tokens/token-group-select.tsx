import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FormControl, FormField, FormItem } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { cn } from "@/lib/utils";
import type { UserGroupInfo } from "@/openapi";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Control } from "react-hook-form";
import type { TokenFormSchema } from "@/lib/validation/token";

const AUTO_GROUP = "auto";
// The usable set can hold thousands of per-channel groups; keep the DOM small
// and let the search input narrow the list.
const MAX_VISIBLE_MODELS = 25;

type TokenGroupSelectProps = {
  control: Control<TokenFormSchema>;
  selectedGroups: string[];
  groups: Record<string, UserGroupInfo>;
};

type GroupOption = {
  group: string;
  model: string;
  provider: string;
  vendor: string | null;
  ratio: number | null;
};

type ModelBucket = {
  model: string;
  vendor: string | null;
  options: GroupOption[];
};

// Group descs are emitted by the channel sync as "model via provider (vendor)";
// anything that doesn't match renders under the raw group name.
const DESC_RE = /^(.+) via (.+) \((.+)\)$/;

function parseGroupOption(group: string, info: UserGroupInfo): GroupOption {
  const ratio = typeof info.ratio === "number" ? info.ratio : null;
  const match = typeof info.desc === "string" ? DESC_RE.exec(info.desc) : null;
  if (!match) return { group, model: group, provider: "", vendor: null, ratio };
  return {
    group,
    model: match[1],
    provider: match[2],
    vendor: match[3],
    ratio,
  };
}

function buildModelBuckets(
  groups: Record<string, UserGroupInfo>,
  query: string,
  selected: string[],
): ModelBucket[] {
  const buckets = new Map<string, ModelBucket>();
  for (const [group, info] of Object.entries(groups)) {
    if (group === AUTO_GROUP) continue;
    const option = parseGroupOption(group, info);
    if (
      query &&
      !option.model.toLowerCase().includes(query) &&
      !option.provider.toLowerCase().includes(query) &&
      !group.toLowerCase().includes(query)
    ) {
      continue;
    }
    const bucket = buckets.get(option.model);
    if (bucket) bucket.options.push(option);
    else
      buckets.set(option.model, {
        model: option.model,
        vendor: option.vendor,
        options: [option],
      });
  }
  const list = [...buckets.values()];
  for (const bucket of list) {
    bucket.options.sort(
      (a, b) => (a.ratio ?? Infinity) - (b.ratio ?? Infinity),
    );
  }
  // Models containing a selected group float to the top so current pins are
  // always visible; the rest sort alphabetically.
  const hasSelected = (b: ModelBucket) =>
    b.options.some((o) => selected.includes(o.group));
  return list
    .sort((a, b) => {
      const aSel = hasSelected(a);
      const bSel = hasSelected(b);
      if (aSel !== bSel) return aSel ? -1 : 1;
      return a.model.localeCompare(b.model);
    })
    .slice(0, MAX_VISIBLE_MODELS);
}

function ratioLabel(ratio: number | null): string | null {
  return ratio == null ? null : `${ratio}x`;
}

export function TokenGroupSelect(props: TokenGroupSelectProps) {
  const t = useTranslations();
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const buckets = buildModelBuckets(props.groups, query, props.selectedGroups);
  const autoInfo = props.groups[AUTO_GROUP];
  const autoSelected = props.selectedGroups.includes(AUTO_GROUP);

  // "auto" is mutually exclusive with pinned groups; empty falls back to auto.
  function toggle(name: string, selected: string[]): string[] {
    if (name === AUTO_GROUP) return [AUTO_GROUP];
    const withoutAuto = selected.filter((g) => g !== AUTO_GROUP);
    const next = withoutAuto.includes(name)
      ? withoutAuto.filter((g) => g !== name)
      : [...withoutAuto, name];
    return next.length > 0 ? next : [AUTO_GROUP];
  }

  function badgeLabel(group: string): string {
    const info = props.groups[group];
    if (group === AUTO_GROUP || !info) return group;
    const option = parseGroupOption(group, info);
    return option.provider
      ? `${option.model} / ${option.provider}`
      : option.model;
  }

  return (
    <FormField
      control={props.control}
      name="groups"
      render={({ field }) => (
        <FormItem>
          <Popover>
            <PopoverTrigger
              render={
                <FormControl>
                  <Button
                    variant="outline"
                    className="h-auto min-h-9 w-full items-center justify-between gap-2 px-2 py-1.5 font-normal"
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                      {props.selectedGroups.map((name) => (
                        <Badge
                          key={name}
                          variant="secondary"
                          className="gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          {badgeLabel(name)}
                          {ratioLabel(
                            parseGroupOption(name, props.groups[name] ?? {})
                              .ratio,
                          ) && (
                            <span className="text-muted-foreground">
                              {ratioLabel(
                                parseGroupOption(name, props.groups[name] ?? {})
                                  .ratio,
                              )}
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                    <Icon
                      name="chevrons-up-down"
                      className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                    />
                  </Button>
                </FormControl>
              }
            />
            <PopoverContent
              className="w-[--radix-popover-trigger-width] p-0"
              align="start"
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={t("TOKEN.FORM.GROUP_SEARCH_PLACEHOLDER")}
                  value={search}
                  onValueChange={setSearch}
                />
                <CommandList className="max-h-72">
                  <CommandEmpty>{t("TOKEN.FORM.GROUP_EMPTY")}</CommandEmpty>
                  {!query && (
                    <CommandGroup>
                      <CommandItem
                        value={AUTO_GROUP}
                        onSelect={() =>
                          field.onChange(
                            toggle(AUTO_GROUP, props.selectedGroups),
                          )
                        }
                        className="[&>svg]:hidden"
                      >
                        <div
                          className={cn(
                            "border-primary mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                            autoSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible",
                          )}
                        >
                          <Icon name="check" className="h-4 w-4" />
                        </div>
                        <Icon
                          name="shuffle"
                          className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                        />
                        <span className="font-mono text-xs">{AUTO_GROUP}</span>
                        <span className="text-muted-foreground ml-auto truncate pl-2 text-[11px]">
                          {autoInfo?.desc ?? ""}
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {buckets.map((bucket) => (
                    <CommandGroup
                      key={bucket.model}
                      heading={
                        <div className="flex items-center gap-1.5">
                          {bucket.vendor && (
                            <VendorIcon vendor={bucket.vendor} size={14} />
                          )}
                          <span className="font-mono">{bucket.model}</span>
                          <span className="text-muted-foreground ml-auto font-mono text-[10px]">
                            {bucket.options.length}
                          </span>
                        </div>
                      }
                    >
                      {bucket.options.map((option) => {
                        const isSelected = props.selectedGroups.includes(
                          option.group,
                        );
                        return (
                          <CommandItem
                            key={option.group}
                            value={option.group}
                            onSelect={() =>
                              field.onChange(
                                toggle(option.group, props.selectedGroups),
                              )
                            }
                            className="[&>svg]:hidden"
                          >
                            <div
                              className={cn(
                                "border-primary mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                                isSelected
                                  ? "bg-primary text-primary-foreground"
                                  : "opacity-50 [&_svg]:invisible",
                              )}
                            >
                              <Icon name="check" className="h-4 w-4" />
                            </div>
                            <span className="truncate font-mono text-xs">
                              {option.provider || option.group}
                            </span>
                            <span className="text-muted-foreground ml-auto shrink-0 pl-2 font-mono text-[11px]">
                              {ratioLabel(option.ratio) ?? ""}
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </FormItem>
      )}
    />
  );
}
