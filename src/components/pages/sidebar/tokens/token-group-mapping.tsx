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
import { groupDisplayLabel } from "@/lib/api/pricing";
import { cn } from "@/lib/utils";
import type { PricingVendorModel, UserGroupInfo } from "@/openapi";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Control } from "react-hook-form";
import type { TokenFormSchema } from "@/lib/validation/token";

const GROUP_SEARCH_THRESHOLD = 8;
const MODEL_ROW_PX = 33;
const LIST_VIEWPORT_PX = 288;

export type GroupMapping = Record<string, string[]>;

type TokenGroupMappingProps = {
  control: Control<TokenFormSchema>;
  mapping: GroupMapping;
  groups: Record<string, UserGroupInfo>;
  models: PricingVendorModel[];
  /** 1x list price per model, so a group's real rate is price * ratio. */
  prices: Map<string, { input: number; output: number }>;
};

type GroupOption = {
  group: string;
  provider: string;
  ratio: number | null;
  /** False when every channel behind the group is currently disabled. */
  online: boolean;
};

const DESC_RE = /^(.+) via (.+) \((.+)\)$/;

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
      online: info.online !== false,
    };
    const list = byModel.get(match[1]);
    if (list) list.push(option);
    else byModel.set(match[1], [option]);
  }
  for (const list of byModel.values()) {
    list.sort(
      (a, b) =>
        Number(b.online) - Number(a.online) ||
        (a.ratio ?? Infinity) - (b.ratio ?? Infinity),
    );
  }
  return byModel;
}

function ratioLabel(ratio: number | null): string {
  return ratio == null ? "" : `${ratio}x`;
}

/** Trailing zeros hide how cheap the cheapest lanes are, so keep 4 decimals. */
function perMillion(value: number): string {
  return `$${value < 1 ? value.toFixed(4) : value.toFixed(2)}`;
}

function priceLabel(
  price: { input: number; output: number } | undefined,
  ratio: number | null,
): string {
  if (!price || ratio == null) return "";
  return `${perMillion(price.input * ratio)} / ${perMillion(price.output * ratio)}`;
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
      <CheckIcon className="text-primary-foreground! h-4 w-4" />
    </div>
  );
}

function ModelGroupPopover(props: {
  model: string;
  price?: { input: number; output: number };
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
      <PopoverTrigger render={props.children} nativeButton={false} />
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
                  className={cn(
                    "[&>svg]:hidden",
                    !option.online && "opacity-50",
                  )}
                >
                  <CheckBox checked={props.selected.includes(option.group)} />
                  {/* Same taxonomy as the chat model drawer's UptimeDot:
                      destructive = nothing behind it is serving right now. */}
                  <span
                    className={cn(
                      "mr-1.5 h-2 w-2 shrink-0 rounded-full",
                      option.online
                        ? "bg-[var(--success)]"
                        : "bg-[var(--destructive)]",
                    )}
                    title={
                      option.online ? undefined : t("TOKEN.FORM.GROUP_OFFLINE")
                    }
                  />
                  <span
                    className="truncate font-mono text-xs"
                    title={
                      option.online
                        ? option.group
                        : `${option.group} - ${t("TOKEN.FORM.GROUP_OFFLINE")}`
                    }
                  >
                    {groupDisplayLabel(
                      option.group,
                      props.model.replace(/:/g, "-"),
                    )}
                  </span>
                  <span className="text-muted-foreground ml-auto shrink-0 pl-2 text-right font-mono text-[11px] leading-tight">
                    <span className="block">{ratioLabel(option.ratio)}</span>
                    {priceLabel(props.price, option.ratio) && (
                      <span className="block opacity-70">
                        {priceLabel(props.price, option.ratio)}
                      </span>
                    )}
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
  const [typeFilter, setTypeFilter] = useState("Text");
  const [openModel, setOpenModel] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const modelGroups = buildModelGroupOptions(props.groups);
  const query = search.trim().toLowerCase();

  const overriddenCount = Object.keys(props.mapping).length;

  const overridableModels = props.models.filter((m) =>
    modelGroups.has(m.model_name),
  );
  const TAG_ORDER = ["Text", "Image", "Video"];
  const tags = [...new Set(overridableModels.map((m) => m.tag))].sort(
    (a, b) => {
      const ra = TAG_ORDER.indexOf(a);
      const rb = TAG_ORDER.indexOf(b);
      return (
        (ra === -1 ? TAG_ORDER.length : ra) -
          (rb === -1 ? TAG_ORDER.length : rb) || a.localeCompare(b)
      );
    },
  );

  const activeTag = tags.includes(typeFilter) ? typeFilter : (tags[0] ?? null);

  const visibleModels = overridableModels
    .filter((m) =>
      query ? m.model_name.toLowerCase().includes(query) : m.tag === activeTag,
    )
    .sort((a, b) => {
      const aOv = !!props.mapping[a.model_name];
      const bOv = !!props.mapping[b.model_name];
      if (aOv !== bOv) return aOv ? -1 : 1;
      return b.release_ts - a.release_ts;
    });

  const [scrollTop, setScrollTop] = useState(0);
  const startIdx = Math.max(0, Math.floor(scrollTop / MODEL_ROW_PX) - 10);
  const endIdx = Math.min(
    visibleModels.length,
    Math.ceil((scrollTop + LIST_VIEWPORT_PX) / MODEL_ROW_PX) + 10,
  );
  const windowedModels = visibleModels.slice(startIdx, endIdx);

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
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
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
              <PopoverContent className="w-(--anchor-width) p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t("TOKEN.FORM.GROUP_MODEL_SEARCH")}
                    value={search}
                    onValueChange={setSearch}
                  />
                  {tags.length > 1 && !query && (
                    <div className="flex gap-1 overflow-x-auto border-b px-2 py-1.5">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={activeTag === tag ? "default" : "outline"}
                          className="cursor-pointer text-[10px]"
                          onClick={() => setTypeFilter(tag)}
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
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
                  <CommandList
                    className="max-h-72"
                    onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
                  >
                    <CommandEmpty>{t("TOKEN.FORM.GROUP_EMPTY")}</CommandEmpty>
                    <CommandGroup>
                      {startIdx > 0 && (
                        <div
                          aria-hidden
                          style={{ height: startIdx * MODEL_ROW_PX }}
                        />
                      )}
                      {windowedModels.map((model) => {
                        const selected = props.mapping[model.model_name] ?? [];
                        const options = modelGroups.get(model.model_name) ?? [];
                        const overridden = selected.length > 0;
                        const cheapest = options.find((o) =>
                          selected.includes(o.group),
                        );
                        return (
                          <ModelGroupPopover
                            key={model.model_name}
                            model={model.model_name}
                            price={props.prices.get(model.model_name)}
                            options={options}
                            selected={selected}
                            onChange={(groups) =>
                              setModelGroups(model.model_name, groups)
                            }
                            open={openModel === model.model_name}
                            onOpenChange={(open) =>
                              setOpenModel(open ? model.model_name : null)
                            }
                          >
                            <CommandItem
                              value={model.model_name}
                              onSelect={() =>
                                setOpenModel(
                                  openModel === model.model_name
                                    ? null
                                    : model.model_name,
                                )
                              }
                              className={cn(
                                "h-8.25 [&>svg]:hidden",
                                overridden && "border-primary border-l-2",
                              )}
                            >
                              <VendorIcon vendor={model.vendor} size={14} />
                              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                                {model.model_name}
                              </span>
                              {model.is_free && (
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
                      {endIdx < visibleModels.length && (
                        <div
                          aria-hidden
                          style={{
                            height:
                              (visibleModels.length - endIdx) * MODEL_ROW_PX,
                          }}
                        />
                      )}
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
