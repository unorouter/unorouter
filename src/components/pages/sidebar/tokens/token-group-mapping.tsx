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

// The usable set holds thousands of per-channel groups; the model list renders
// capped and search narrows it.
const MAX_VISIBLE_MODELS = 30;
const GROUP_SEARCH_THRESHOLD = 8;

export type GroupMapping = Record<string, string[]>;

type PricingModelLite = {
  name: string;
  vendor: string;
  isFree: boolean;
};

type TokenGroupMappingProps = {
  control: Control<TokenFormSchema>;
  mapping: GroupMapping;
  groups: Record<string, UserGroupInfo>;
  models: PricingModelLite[];
};

type GroupOption = {
  group: string;
  provider: string;
  ratio: number | null;
};

// Group descs are emitted by the channel sync as "model via provider (vendor)".
const DESC_RE = /^(.+) via (.+) \((.+)\)$/;

// model name -> its pinnable groups, cheapest first.
export function buildModelGroupOptions(
  groups: Record<string, UserGroupInfo>,
): Map<string, GroupOption[]> {
  const byModel = new Map<string, GroupOption[]>();
  for (const [group, info] of Object.entries(groups)) {
    if (group === "auto") continue;
    const match =
      typeof info.desc === "string" ? DESC_RE.exec(info.desc) : null;
    if (!match) continue;
    const option: GroupOption = {
      group,
      provider: match[2],
      ratio: typeof info.ratio === "number" ? info.ratio : null,
    };
    const list = byModel.get(match[1]);
    if (list) list.push(option);
    else byModel.set(match[1], [option]);
  }
  for (const list of byModel.values()) {
    list.sort((a, b) => (a.ratio ?? Infinity) - (b.ratio ?? Infinity));
  }
  return byModel;
}

function ratioLabel(ratio: number | null): string {
  return ratio == null ? "" : `${ratio}x`;
}

function CheckBox(props: { checked: boolean }) {
  return (
    <div
      className={cn(
        "border-primary mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
        props.checked
          ? "bg-primary text-primary-foreground"
          : "opacity-50 [&_svg]:invisible",
      )}
    >
      <Icon name="check" className="h-4 w-4" />
    </div>
  );
}

function ModelGroupPopover(props: {
  model: string;
  options: GroupOption[];
  selected: string[];
  onChange: (groups: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactElement;
}) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const options = query
    ? props.options.filter(
        (o) =>
          o.provider.toLowerCase().includes(query) ||
          o.group.toLowerCase().includes(query),
      )
    : props.options;
  const isAuto = props.selected.length === 0;

  function toggleGroup(group: string) {
    const next = props.selected.includes(group)
      ? props.selected.filter((g) => g !== group)
      : [...props.selected, group];
    props.onChange(next);
  }

  return (
    <Popover
      open={props.open}
      onOpenChange={(next) => {
        props.onOpenChange(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger render={props.children} />
      <PopoverContent
        side="right"
        align="start"
        sideOffset={6}
        className="w-72 p-0"
      >
        <Command shouldFilter={false}>
          {props.options.length > GROUP_SEARCH_THRESHOLD && (
            <CommandInput
              placeholder={t("TOKEN.FORM.GROUP_SEARCH_PLACEHOLDER")}
              value={search}
              onValueChange={setSearch}
            />
          )}
          <CommandList className="max-h-60">
            <CommandEmpty>{t("TOKEN.FORM.GROUP_EMPTY")}</CommandEmpty>
            <CommandGroup>
              {!query && (
                <CommandItem
                  value="auto"
                  onSelect={() => props.onChange([])}
                  className="[&>svg]:hidden"
                >
                  <CheckBox checked={isAuto} />
                  <Icon
                    name="shuffle"
                    className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                  />
                  <span className="font-mono text-xs">auto</span>
                </CommandItem>
              )}
              {options.map((option) => (
                <CommandItem
                  key={option.group}
                  value={option.group}
                  onSelect={() => toggleGroup(option.group)}
                  className="[&>svg]:hidden"
                >
                  <CheckBox checked={props.selected.includes(option.group)} />
                  <span className="truncate font-mono text-xs">
                    {option.provider}
                  </span>
                  <span className="text-muted-foreground ml-auto shrink-0 pl-2 font-mono text-[11px]">
                    {ratioLabel(option.ratio)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function TokenGroupMapping(props: TokenGroupMappingProps) {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [openModel, setOpenModel] = useState<string | null>(null);

  const modelGroups = buildModelGroupOptions(props.groups);
  const query = search.trim().toLowerCase();

  const overriddenCount = Object.keys(props.mapping).length;

  // Only models with at least one pinnable group are overridable.
  const visibleModels = props.models
    .filter((m) => modelGroups.has(m.name))
    .filter((m) => !query || m.name.toLowerCase().includes(query))
    .sort((a, b) => {
      const aOv = !!props.mapping[a.name];
      const bOv = !!props.mapping[b.name];
      if (aOv !== bOv) return aOv ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, MAX_VISIBLE_MODELS);

  return (
    <FormField
      control={props.control}
      name="group_mapping"
      render={({ field }) => {
        function setModelGroups(model: string, groups: string[]) {
          const next: GroupMapping = { ...props.mapping };
          if (groups.length === 0) delete next[model];
          else next[model] = groups;
          field.onChange(next);
        }

        return (
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
                        <Badge
                          variant="secondary"
                          className="rounded-sm px-1.5 py-0.5 font-mono text-[10px]"
                        >
                          auto
                        </Badge>
                        {overriddenCount > 0 && (
                          <Badge className="rounded-sm px-1.5 py-0.5 font-mono text-[10px]">
                            {t("TOKEN.FORM.GROUP_OVERRIDES_COUNT", {
                              count: overriddenCount,
                            })}
                          </Badge>
                        )}
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
                    placeholder={t("TOKEN.FORM.GROUP_MODEL_SEARCH")}
                    value={search}
                    onValueChange={setSearch}
                  />
                  {overriddenCount > 0 && (
                    <div className="text-muted-foreground flex items-center justify-between border-b px-3 py-1.5 text-[11px]">
                      <span>
                        {t("TOKEN.FORM.GROUP_OVERRIDES_COUNT", {
                          count: overriddenCount,
                        })}
                      </span>
                      <button
                        type="button"
                        className="hover:text-foreground underline"
                        onClick={() => field.onChange({})}
                      >
                        {t("TOKEN.FORM.GROUP_CLEAR_ALL")}
                      </button>
                    </div>
                  )}
                  <CommandList className="max-h-72">
                    <CommandEmpty>{t("TOKEN.FORM.GROUP_EMPTY")}</CommandEmpty>
                    <CommandGroup>
                      {visibleModels.map((model) => {
                        const selected = props.mapping[model.name] ?? [];
                        const options = modelGroups.get(model.name) ?? [];
                        const overridden = selected.length > 0;
                        const cheapest = options.find((o) =>
                          selected.includes(o.group),
                        );
                        return (
                          <ModelGroupPopover
                            key={model.name}
                            model={model.name}
                            options={options}
                            selected={selected}
                            onChange={(groups) =>
                              setModelGroups(model.name, groups)
                            }
                            open={openModel === model.name}
                            onOpenChange={(open) =>
                              setOpenModel(open ? model.name : null)
                            }
                          >
                            <CommandItem
                              value={model.name}
                              onSelect={() =>
                                setOpenModel(
                                  openModel === model.name ? null : model.name,
                                )
                              }
                              className={cn(
                                "[&>svg]:hidden",
                                overridden && "border-primary border-l-2",
                              )}
                            >
                              <VendorIcon vendor={model.vendor} size={14} />
                              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                                {model.name}
                              </span>
                              {model.isFree && (
                                <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-0.5 text-[10px] leading-none font-medium text-emerald-700 dark:text-emerald-300">
                                  FREE
                                </span>
                              )}
                              {overridden ? (
                                <Badge className="ml-2 shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px]">
                                  {selected.length}
                                  {cheapest?.ratio != null &&
                                    ` ${ratioLabel(cheapest.ratio)}`}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-muted-foreground ml-2 shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px]"
                                >
                                  auto
                                </Badge>
                              )}
                              <Icon
                                name="chevron-right"
                                className="text-muted-foreground ml-1 h-3.5 w-3.5 shrink-0"
                              />
                            </CommandItem>
                          </ModelGroupPopover>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormItem>
        );
      }}
    />
  );
}
