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
import type { ReactNode } from "react";
import type { Control, FieldValues, Path, PathValue } from "react-hook-form";

type NamedEntity = { id: string; name: string };

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
        const ids = field.value as string[];
        const lookup = new Map(options.map((o) => [o.id, o.name]));
        const orderedItems = ids
          .map((id) => ({ id, name: lookup.get(id) ?? id }))
          .filter((it) => lookup.has(it.id));
        return (
          <FormItem>
            <FormLabel>{props.label}</FormLabel>
            <FormControl>
              <Combobox
                items={options.map((o) => o.id)}
                multiple
                value={ids}
                onValueChange={(next) =>
                  field.onChange(next as PathValue<T, Path<T>>)
                }
                itemToStringLabel={(id) => lookup.get(id) ?? id}
              >
                <ComboboxChips>
                  <ComboboxValue>
                    {(value: string[]) =>
                      value.map((id) => (
                        <ComboboxChip key={id} aria-label={lookup.get(id)}>
                          {lookup.get(id) ?? id}
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
                        {lookup.get(id) ?? id}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </FormControl>
            {orderedItems.length > 1 && (
              <div className="mt-2">
                <p className="text-muted-foreground mb-1 text-xs">
                  {props.reorderHint}
                </p>
                <SortableList
                  items={orderedItems}
                  onReorder={(orderedIds) =>
                    field.onChange(orderedIds as PathValue<T, Path<T>>)
                  }
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
