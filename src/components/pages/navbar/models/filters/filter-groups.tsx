"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Slider } from "@/components/ui/slider";
import { AGE_STEPS_DAYS } from "@/lib/api/model-modality";
import { msg, type TranslationKey } from "@/lib/config/constants";
import { cn } from "@/lib/utils";
import { formatTokenCount } from "@/lib/utils/format/number";
import { PRICE_MAX } from "@/store/models-store";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

export function GroupShell(props: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <SidebarGroup className="py-1">
      <Collapsible defaultOpen={props.defaultOpen ?? true}>
        <CollapsibleTrigger className="text-foreground group/ct flex w-full items-center justify-between px-2 py-1.5 font-mono text-xs font-medium uppercase">
          <span>{props.label}</span>
          <Icon
            name="chevron-down"
            className="h-4 w-4 transition-transform group-data-panel-open/ct:rotate-180"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent className="px-2 pt-1 pb-2">
            {props.children}
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}

export function CheckRow(props: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded px-1.5 py-1 text-left font-mono text-sm transition-colors",
        props.checked
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          props.checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border",
        )}
      >
        {props.checked && <Icon name="circle-check" className="h-3 w-3" />}
      </span>
      <span className="truncate">{props.label}</span>
    </button>
  );
}

const CONTEXT_STEPS = [0, 4000, 16000, 64000, 256000, 1000000];

const INPUT_MODALITIES = ["text", "image", "file", "audio", "video"] as const;

const MODALITY_LABEL = {
  text: msg("MODELS.MODALITY.TEXT"),
  image: msg("MODELS.MODALITY.IMAGE"),
  file: msg("MODELS.MODALITY.FILE"),
  audio: msg("MODELS.MODALITY.AUDIO"),
  video: msg("MODELS.MODALITY.VIDEO"),
} satisfies Record<(typeof INPUT_MODALITIES)[number], ReturnType<typeof msg>>;

export function InputModalitiesGroup(props: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations();
  return (
    <GroupShell label={t("MODELS.FILTER.INPUT_MODALITIES")}>
      {INPUT_MODALITIES.map((mod) => (
        <CheckRow
          key={mod}
          label={t(MODALITY_LABEL[mod])}
          checked={props.value.includes(mod)}
          onToggle={() => props.onChange(toggled(props.value, mod))}
        />
      ))}
    </GroupShell>
  );
}

export function ToolsGroup(props: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  const t = useTranslations();
  return (
    <GroupShell label={t("MODELS.FILTER.TOOLS")}>
      <CheckRow
        label={t("MODELS.FILTER.FUNCTION_CALLING")}
        checked={props.value}
        onToggle={() => props.onChange(!props.value)}
      />
    </GroupShell>
  );
}

export function PricingGroup(props: {
  value: boolean;
  onChange: (next: boolean) => void;
  discountedOnly: boolean;
  onDiscountedOnlyChange: (next: boolean) => void;
}) {
  const t = useTranslations();
  return (
    <GroupShell label={t("MODELS.FILTER.PRICING")}>
      <CheckRow
        label={t("MODELS.FILTER.HIDE_FREE")}
        checked={props.value}
        onToggle={() => props.onChange(!props.value)}
      />
      <CheckRow
        label={t("MODELS.FILTER.DISCOUNTED_ONLY")}
        checked={props.discountedOnly}
        onToggle={() => props.onDiscountedOnlyChange(!props.discountedOnly)}
      />
    </GroupShell>
  );
}

export function ContextGroup(props: {
  value: number;
  onChange: (next: number) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const idx = Math.max(0, CONTEXT_STEPS.indexOf(props.value));
  return (
    <GroupShell label={t("MODELS.FILTER.CONTEXT_LENGTH")}>
      <div className="px-1.5 pt-2">
        <Slider
          aria-label={t("MODELS.FILTER.CONTEXT_LENGTH")}
          min={0}
          max={CONTEXT_STEPS.length - 1}
          step={1}
          value={idx}
          onValueChange={(v) =>
            props.onChange(CONTEXT_STEPS[Array.isArray(v) ? v[0] : v] ?? 0)
          }
        />
        <div className="text-muted-foreground mt-2 flex justify-between font-mono text-[10px]">
          <span>{t("MODELS.FILTER.MIN")}</span>
          <span>
            {props.value > 0
              ? formatTokenCount(props.value, locale)
              : t("MODELS.FILTER.ANY")}
          </span>
        </div>
      </div>
    </GroupShell>
  );
}

export function PriceGroup(props: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  const t = useTranslations();
  const commitMax = (raw: string) => {
    if (raw.trim() === "") {
      props.onChange(PRICE_MAX);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    props.onChange(Math.min(PRICE_MAX, Math.max(0, n)));
  };
  return (
    <GroupShell label={props.label}>
      <div className="px-1.5 pt-2">
        <Slider
          aria-label={props.label}
          min={0}
          max={PRICE_MAX}
          step={0.5}
          value={props.value}
          onValueChange={(v) => props.onChange(Array.isArray(v) ? v[0] : v)}
        />
        <div className="text-muted-foreground mt-2 flex items-center justify-between font-mono text-[10px]">
          <span>$0</span>
          <div className="flex items-center gap-1">
            <span>$</span>
            <input
              type="number"
              min={0}
              max={PRICE_MAX}
              step={0.5}
              aria-label={props.label}
              value={props.value >= PRICE_MAX ? "" : props.value}
              placeholder={t("MODELS.FILTER.ANY")}
              onChange={(e) => commitMax(e.target.value)}
              className="border-input focus-visible:ring-ring/50 w-16 [appearance:textfield] rounded-md border bg-transparent px-1.5 py-0.5 text-right font-mono text-[10px] tabular-nums outline-none focus-visible:ring-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </div>
      </div>
    </GroupShell>
  );
}

const AGE_LABEL_KEY: Partial<Record<number, TranslationKey>> = {
  7: msg("MODELS.FILTER.AGE_7D"),
  30: msg("MODELS.FILTER.AGE_30D"),
  90: msg("MODELS.FILTER.AGE_90D"),
  365: msg("MODELS.FILTER.AGE_1Y"),
};

export function ModelAgeGroup(props: {
  value: number;
  onChange: (next: number) => void;
}) {
  const t = useTranslations();
  const steps: readonly number[] = AGE_STEPS_DAYS;
  const idx = Math.max(0, steps.indexOf(props.value));
  // A hand-edited URL can carry any number; only the listed steps have labels.
  const ageLabel = (days: number) => {
    const key = AGE_LABEL_KEY[days];
    return key ? t(key) : t("MODELS.FILTER.ANY");
  };
  return (
    <GroupShell label={t("MODELS.FILTER.MODEL_AGE")}>
      <div className="px-1.5 pt-2">
        <Slider
          aria-label={t("MODELS.FILTER.MODEL_AGE")}
          min={0}
          max={AGE_STEPS_DAYS.length - 1}
          step={1}
          value={idx}
          onValueChange={(v) =>
            props.onChange(AGE_STEPS_DAYS[Array.isArray(v) ? v[0] : v] ?? 0)
          }
        />
        <div className="text-muted-foreground mt-2 flex justify-between font-mono text-[10px]">
          <span>{t("MODELS.FILTER.ANY")}</span>
          <span>{ageLabel(props.value)}</span>
        </div>
      </div>
    </GroupShell>
  );
}

export function MultiSelectGroup(props: {
  label: string;
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  optionLabel?: (option: string) => string;
}) {
  if (props.options.length === 0) return null;
  return (
    <GroupShell label={props.label} defaultOpen={false}>
      <div className="max-h-64 overflow-y-auto">
        {props.options.map((opt) => (
          <CheckRow
            key={opt}
            label={props.optionLabel ? props.optionLabel(opt) : opt}
            checked={props.value.includes(opt)}
            onToggle={() => props.onChange(toggled(props.value, opt))}
          />
        ))}
      </div>
    </GroupShell>
  );
}

export function toggled<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((v) => v !== value)
    : [...values, value];
}

export function FilterSidebarShell(props: {
  showReset: boolean;
  onReset: () => void;
  children: ReactNode;
}) {
  const t = useTranslations();
  return (
    <Sidebar
      collapsible="offcanvas"
      className="absolute! inset-y-0 h-full! bg-transparent"
    >
      <div className="sticky top-14 flex max-h-[calc(100svh-3.5rem)] flex-col">
        <SidebarHeader className="flex-row items-center justify-between px-3 py-2">
          <span className="font-mono text-sm font-medium">
            {t("MODELS.FILTER.TITLE")}
          </span>
          {props.showReset && (
            <Button
              variant="ghost"
              size="sm"
              onClick={props.onReset}
              className="h-7 px-2"
            >
              {t("MODELS.FILTER.RESET")}
              <Icon name="x" className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </SidebarHeader>
        <SidebarContent className="gap-4 overflow-y-auto px-3 py-2">
          {props.children}
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
