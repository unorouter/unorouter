"use client";

import { SortableList } from "@/components/elements/dnd/sortable-list";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NONE_VALUE } from "@/lib/config/constants";
import type { TranslationKey } from "@/lib/types";
import type { ConversationOverridesForm } from "@/lib/validation/rp-forms";
import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";

import { MultiSelectPopover } from "../rp/multi-select-popover";

type Form = ConversationOverridesForm;
type NamedEntity = { id: string; name: string };

// Single-select bound to a persona/preset-style field: a "__none__" sentinel
// option plus one option per entity.
export function EntitySelect(props: {
  control: Control<Form>;
  name: "personaId" | "presetId";
  label: string;
  options: NamedEntity[] | undefined;
}) {
  const t = useTranslations();
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <Select
              value={field.value}
              onValueChange={(v) => field.onChange(v ?? NONE_VALUE)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {field.value === NONE_VALUE
                    ? t("CHAT.OVERRIDES.NONE")
                    : (props.options?.find((o) => o.id === field.value)?.name ??
                      t("CHAT.OVERRIDES.NONE"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>
                  {t("CHAT.OVERRIDES.NONE")}
                </SelectItem>
                {props.options?.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>
        </FormItem>
      )}
    />
  );
}

// Select bound to a string field whose values map 1:1 to translation keys.
// `placeholder` keys render for the sentinel values that have no own option.
export function KeyedSelect<
  N extends "reasoningEffort" | "webSearchEngine" | "webSearchContextSize",
>(props: {
  control: Control<Form>;
  name: N;
  label: string;
  fallback: Form[N];
  optionKeys: Record<string, TranslationKey>;
  /** Sentinel values rendered before the mapped options. */
  leadingOptions?: { value: string; labelKey: TranslationKey }[];
  labelClassName?: string;
}) {
  const t = useTranslations();
  const leading = props.leadingOptions ?? [];
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => {
        const labelFor = (v: string) => {
          const lead = leading.find((l) => l.value === v);
          if (lead) return t(lead.labelKey);
          const key = props.optionKeys[v];
          return key ? t(key) : v;
        };
        return (
          <FormItem>
            {props.labelClassName ? (
              <Label className={props.labelClassName}>{props.label}</Label>
            ) : (
              <FormLabel>{props.label}</FormLabel>
            )}
            <FormControl>
              <Select
                value={field.value}
                onValueChange={(v) =>
                  field.onChange(v ?? props.fallback)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{labelFor(field.value)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {leading.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {t(l.labelKey)}
                    </SelectItem>
                  ))}
                  {Object.keys(props.optionKeys).map((k) => (
                    <SelectItem key={k} value={k}>
                      {t(props.optionKeys[k])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
          </FormItem>
        );
      }}
    />
  );
}

// Multi-select bound to characterIds/lorebookIds: a popover picker plus a
// drag-to-reorder list once more than one item is selected.
export function BindingMultiSelect(props: {
  control: Control<Form>;
  name: "characterIds" | "lorebookIds";
  label: string;
  searchPlaceholder: string;
  emptyText: string;
  options: NamedEntity[] | undefined;
}) {
  const t = useTranslations();
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => {
        const ids = field.value;
        const lookup = new Map(
          (props.options ?? []).map((o) => [o.id, o.name]),
        );
        const orderedItems = ids
          .map((id) => ({ id, name: lookup.get(id) ?? id }))
          .filter((it) => lookup.has(it.id));
        return (
          <FormItem>
            <FormLabel>{props.label}</FormLabel>
            <FormControl>
              <MultiSelectPopover
                options={
                  props.options?.map((o) => ({ id: o.id, label: o.name })) ??
                  []
                }
                value={field.value}
                onChange={field.onChange}
                triggerLabel={props.label}
                searchPlaceholder={props.searchPlaceholder}
                emptyText={props.emptyText}
              />
            </FormControl>
            {orderedItems.length > 1 && (
              <div className="mt-2">
                <p className="text-muted-foreground mb-1 text-xs">
                  {t("CHAT.OVERRIDES.REORDER_HINT")}
                </p>
                <SortableList
                  items={orderedItems}
                  onReorder={(orderedIds) => field.onChange(orderedIds)}
                  renderItem={(item, handle) => (
                    <div className="border-border/40 bg-card flex items-center gap-2 rounded-md border px-2 py-1.5">
                      {handle}
                      <span className="truncate text-sm">{item.name}</span>
                    </div>
                  )}
                />
              </div>
            )}
          </FormItem>
        );
      }}
    />
  );
}
