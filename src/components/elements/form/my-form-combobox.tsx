"use client";

import { SortableList } from "@/components/elements/dnd/sortable-list";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
} from "@/components/ui/combobox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { RpAvatar } from "@/components/pages/sidebar/chat/rp/shared/rp-list-parts";
import type { NamedEntity } from "@/lib/types";
import { isStringArray } from "@/lib/utils/base";
import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

export function EntityMultiSelect(props: {
  value: string[];
  onChange: (ids: string[]) => void;
  options: NamedEntity[] | undefined;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const options = props.options ?? [];
  const lookup = new Map(options.map((o) => [o.id, o]));
  const name = (id: string) => lookup.get(id)?.name ?? id;
  return (
    <Combobox
      items={options.map((o) => o.id)}
      multiple
      value={props.value}
      onValueChange={(next) => props.onChange(next)}
      itemToStringLabel={name}
    >
      <ComboboxChips>
        <ComboboxValue>
          {(value: string[]) =>
            value.map((id) => (
              <ComboboxChip key={id} aria-label={name(id)}>
                {name(id)}
              </ComboboxChip>
            ))
          }
        </ComboboxValue>
        <ComboboxChipsInput placeholder={props.searchPlaceholder} />
        <ComboboxClear />
      </ComboboxChips>
      <ComboboxContent>
        <ComboboxEmpty>{props.emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(id: string) => (
            <ComboboxItem key={id} value={id}>
              <span className="flex min-w-0 items-center gap-2">
                <RpAvatar
                  mediaId={lookup.get(id)?.avatarMediaId}
                  name={name(id)}
                  className="size-5"
                />
                <span className="truncate">{name(id)}</span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function MyFormCombobox<T extends FieldValues>(props: {
  control: Control<T>;
  name: Path<T>;
  label: string;
  searchPlaceholder: string;
  emptyText: string;
  reorderHint: ReactNode;
  options: NamedEntity[] | undefined;
}) {
  const options = props.options ?? [];
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => {
        const ids = isStringArray(field.value) ? field.value : [];
        const lookup = new Map(options.map((o) => [o.id, o]));
        const orderedItems = ids
          .map((id) => ({ id, name: lookup.get(id)?.name ?? id }))
          .filter((it) => lookup.has(it.id));
        return (
          <FormItem>
            <FormLabel>{props.label}</FormLabel>
            <FormControl>
              <EntityMultiSelect
                value={ids}
                onChange={field.onChange}
                options={options}
                searchPlaceholder={props.searchPlaceholder}
                emptyText={props.emptyText}
              />
            </FormControl>
            {orderedItems.length > 1 && (
              <div className="mt-2">
                <p className="text-muted-foreground mb-1 text-xs">
                  {props.reorderHint}
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
