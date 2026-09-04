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
import type { TokenFormSchema, TokenPinEntry } from "@/lib/validation/token";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

const GROUP_SEARCH_THRESHOLD = 8;
const MODEL_ROW_PX = 33;
const LIST_VIEWPORT_PX = 288;

export type GroupMapping = Record<string, TokenPinEntry>;

/**
 * Slider geometry. The interesting choices are all cheap: of the live non-zero
 * lanes 66% sit under 1x and the median is 0.70x, so a linear 0-4 track would
 * squeeze every real decision into its left quarter. The first 150 steps cover
 * 0-1x and the last 50 cover 1-4x, which keeps the 0.02x-0.04x lanes on
 * distinct steps. The stored value is always the RATIO, never the position, so
 * this curve can be retuned later without rewriting anyone's saved band.
 */
const BAND_STEPS = 200;
const BAND_KNEE_POS = 150;
const BAND_MAX = 4;

export function bandPosToRatio(pos: number): number {
  if (pos <= BAND_KNEE_POS) return pos / BAND_KNEE_POS;
  return (
    1 + ((pos - BAND_KNEE_POS) / (BAND_STEPS - BAND_KNEE_POS)) * (BAND_MAX - 1)
  );
}

export function bandRatioToPos(ratio: number): number {
  if (ratio <= 1) return Math.round(ratio * BAND_KNEE_POS);
  return Math.round(
    BAND_KNEE_POS +
      ((ratio - 1) / (BAND_MAX - 1)) * (BAND_STEPS - BAND_KNEE_POS),
  );
}

function bandRatioLabel(ratio: number, atCeiling: boolean): string {
  if (atCeiling) return `${BAND_MAX}x+`;
  return ratio < 1 ? `${ratio.toFixed(3)}x` : `${ratio.toFixed(2)}x`;
}

/** Groups the band currently catches, cheapest first. */
function groupsInBand(
  options: GroupOption[],
  min: number | undefined,
  max: number | undefined,
): GroupOption[] {
  if (min === undefined && max === undefined) return [];
  return options.filter(
    (o) =>
      o.ratio != null &&
      o.online &&
      (min === undefined || o.ratio >= min) &&
      (max === undefined || o.ratio <= max),
  );
}

export const EMPTY_ENTRY: TokenPinEntry = { groups: [] };

/**
 * Parses stored group_mapping JSON into the entry shape. Unknown input is a
 * runtime value, not a trusted type, so every field is checked rather than
 * asserted. The legacy array form is still accepted here because a key edited
 * before the gateway migration runs would otherwise lose its pins silently.
 */
export function normalizeGroupMapping(raw: unknown): GroupMapping {
  if (typeof raw !== "object" || raw === null) return {};
  const out: GroupMapping = {};
  for (const [model, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      out[model] = { groups: value.filter((g) => typeof g === "string") };
      continue;
    }
    if (typeof value !== "object" || value === null) continue;
    const entry: Record<string, unknown> = { ...value };
    const groups = Array.isArray(entry.groups)
      ? entry.groups.filter((g): g is string => typeof g === "string")
      : [];
    out[model] = {
      groups,
      min: typeof entry.min === "number" ? entry.min : undefined,
      max: typeof entry.max === "number" ? entry.max : undefined,
      auto: entry.auto === true ? true : undefined,
    };
  }
  return out;
}

function entryOf(mapping: GroupMapping, model: string): TokenPinEntry {
  return mapping[model] ?? EMPTY_ENTRY;
}

function entryIsEmpty(entry: TokenPinEntry): boolean {
  return (
    entry.groups.length === 0 &&
    entry.min === undefined &&
    entry.max === undefined &&
    !entry.auto
  );
}

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
  /**
   * Pinned by this key but absent from the catalogue: the provider left, or is
   * between syncs. Rendered anyway so the owner can untick it -- options come
   * from the live group list, so otherwise the row simply would not exist and
   * the pin could never be removed from the UI.
   */
  missing?: boolean;
};

const DESC_RE = /^(.+) via (.+) \((.+)\)$/;

export function buildModelGroupOptions(
  groups: Record<string, UserGroupInfo>,
  mapping: GroupMapping = {},
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
  // Re-add anything the key still pins that the catalogue no longer lists.
  for (const [model, entry] of Object.entries(mapping)) {
    const list = byModel.get(model);
    const known = new Set((list ?? []).map((o) => o.group));
    const pinned = Array.isArray(entry) ? entry : (entry?.groups ?? []);
    const ghosts = pinned
      .filter((group) => !known.has(group))
      .map((group) => ({
        group,
        provider: group,
        ratio: null,
        online: false,
        missing: true,
      }));
    if (ghosts.length === 0) continue;
    if (list) list.push(...ghosts);
    else byModel.set(model, ghosts);
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
  entry: TokenPinEntry;
  onChange: (entry: TokenPinEntry) => void;
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
  const selected = props.entry.groups;
  // Purely the stored flag. Deriving it from "nothing is configured" made the
  // toggle impossible to switch off: turning it off cleared the flag, the
  // derivation saw an empty entry and turned it straight back on.
  const isAuto = props.entry.auto === true;
  const hasBand =
    props.entry.min !== undefined || props.entry.max !== undefined;
  const bandLow = props.entry.min ?? 0;
  const bandHigh = props.entry.max ?? BAND_MAX;
  const caught = groupsInBand(props.options, props.entry.min, props.entry.max);

  function toggleGroup(group: string) {
    const next = selected.includes(group)
      ? selected.filter((g) => g !== group)
      : [...selected, group];
    props.onChange({ ...props.entry, groups: next, auto: undefined });
  }

  function setBand(low: number, high: number) {
    // The top thumb means "and above", so it stores no upper bound at all: a
    // provider that later prices above the ceiling must not be silently
    // excluded by a slider someone parked at the top.
    props.onChange({
      ...props.entry,
      min: low <= 0 ? undefined : low,
      max: high >= BAND_MAX ? undefined : high,
      auto: undefined,
    });
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
        <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
          <div className="min-w-0">
            <div className="text-xs font-medium">
              {t("TOKEN.FORM.BAND_AUTO")}
            </div>
            <div className="text-muted-foreground text-[10px]">
              {t("TOKEN.FORM.BAND_AUTO_HINT")}
            </div>
          </div>
          <Switch
            checked={isAuto}
            onCheckedChange={(checked) =>
              props.onChange({ ...props.entry, auto: checked || undefined })
            }
          />
        </div>
        <div className={cn("border-b px-3 py-2", isAuto && "opacity-50")}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-xs font-medium">
              {t("TOKEN.FORM.BAND_LABEL")}
            </span>
            <span className="text-muted-foreground font-mono text-[11px]">
              {hasBand
                ? `${bandRatioLabel(bandLow, false)} - ${bandRatioLabel(bandHigh, props.entry.max === undefined)}`
                : t("TOKEN.FORM.BAND_OFF")}
            </span>
          </div>
          <Slider
            min={0}
            max={BAND_STEPS}
            step={1}
            value={[bandRatioToPos(bandLow), bandRatioToPos(bandHigh)]}
            aria-label={t("TOKEN.FORM.BAND_LABEL")}
            onValueChange={(value) => {
              if (!Array.isArray(value)) return;
              const [low, high] = value;
              setBand(bandPosToRatio(low), bandPosToRatio(high));
            }}
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="text-muted-foreground text-[10px]">
              {hasBand
                ? t("TOKEN.FORM.BAND_CAUGHT", { count: caught.length })
                : t("TOKEN.FORM.BAND_HINT")}
            </span>
            {hasBand && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground text-[10px] underline"
                onClick={() =>
                  props.onChange({
                    ...props.entry,
                    min: undefined,
                    max: undefined,
                  })
                }
              >
                {t("TOKEN.FORM.BAND_CLEAR")}
              </button>
            )}
          </div>
          {hasBand && caught.length > 0 && (
            <div className="text-muted-foreground mt-1 truncate font-mono text-[10px]">
              {caught
                .slice(0, 3)
                .map((o) =>
                  groupDisplayLabel(o.group, props.model.replace(/:/g, "-")),
                )
                .join(", ")}
              {caught.length > 3 && ` +${caught.length - 3}`}
            </div>
          )}
        </div>
        <Command shouldFilter={false}>
          {props.options.length > GROUP_SEARCH_THRESHOLD && (
            <CommandInput
              placeholder={t("TOKEN.FORM.GROUP_SEARCH_PLACEHOLDER")}
              value={search}
              onValueChange={setSearch}
            />
          )}
          <CommandList className={cn("max-h-60", isAuto && "opacity-50")}>
            <CommandEmpty>{t("TOKEN.FORM.GROUP_EMPTY")}</CommandEmpty>
            <CommandGroup>
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
                  <CheckBox checked={selected.includes(option.group)} />
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
                      option.online
                        ? undefined
                        : t(
                            option.missing
                              ? "TOKEN.FORM.GROUP_MISSING"
                              : "TOKEN.FORM.GROUP_OFFLINE",
                          )
                    }
                  />
                  <span
                    className="truncate font-mono text-xs"
                    title={
                      option.online
                        ? option.group
                        : `${option.group} - ${t(
                            option.missing
                              ? "TOKEN.FORM.GROUP_MISSING"
                              : "TOKEN.FORM.GROUP_OFFLINE",
                          )}`
                    }
                  >
                    {groupDisplayLabel(
                      option.group,
                      props.model.replace(/:/g, "-"),
                    )}
                  </span>
                  <span className="text-muted-foreground ml-auto shrink-0 pl-2 text-right font-mono text-[11px] leading-tight">
                    <span className="block">
                      {option.missing
                        ? t("TOKEN.FORM.GROUP_MISSING_SHORT")
                        : ratioLabel(option.ratio)}
                    </span>
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

  const modelGroups = buildModelGroupOptions(props.groups, props.mapping);
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
        function setModelEntry(model: string, entry: TokenPinEntry) {
          const next: GroupMapping = { ...props.mapping };
          if (entryIsEmpty(entry)) delete next[model];
          else next[model] = entry;
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
                        const entry = entryOf(props.mapping, model.model_name);
                        const options = modelGroups.get(model.model_name) ?? [];
                        const bandOn =
                          entry.min !== undefined || entry.max !== undefined;
                        const overridden =
                          !entry.auto && (entry.groups.length > 0 || bandOn);
                        const cheapest = options.find((o) =>
                          entry.groups.includes(o.group),
                        );
                        const bandCount = bandOn
                          ? groupsInBand(options, entry.min, entry.max).length
                          : 0;
                        return (
                          <ModelGroupPopover
                            key={model.model_name}
                            model={model.model_name}
                            price={props.prices.get(model.model_name)}
                            options={options}
                            entry={entry}
                            onChange={(next) =>
                              setModelEntry(model.model_name, next)
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
                                  {entry.groups.length + bandCount}
                                  {bandOn && " ~"}
                                  {!bandOn &&
                                    cheapest?.ratio != null &&
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
