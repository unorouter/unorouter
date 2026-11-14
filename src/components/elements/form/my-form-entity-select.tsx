"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RpAvatar } from "@/components/pages/sidebar/chat/rp/shared/rp-list-parts";
import { NONE_VALUE } from "@/lib/config/constants";
import type { NamedEntity } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

const entityLabel = (o: NamedEntity) => o.title || o.name;

export function EntitySelect(props: {
  value: string | null;
  onChange: (id: string | null) => void;
  noneLabel: string;
  options: NamedEntity[] | undefined;
  className?: string;
}) {
  const options = props.options ?? [];
  const selected = options.find((o) => o.id === props.value);
  return (
    <Select
      value={props.value ?? NONE_VALUE}
      onValueChange={(v) => props.onChange(!v || v === NONE_VALUE ? null : v)}
    >
      <SelectTrigger className={cn("w-full min-w-0", props.className)}>
        <SelectValue className="min-w-0">
          <span className="truncate">
            {selected ? entityLabel(selected) : props.noneLabel}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>{props.noneLabel}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            <span className="flex min-w-0 items-center gap-2">
              <RpAvatar
                mediaId={o.avatarMediaId}
                name={o.name}
                className="size-5"
              />
              <span className="truncate">{entityLabel(o)}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MyFormEntitySelect<T extends FieldValues>(props: {
  control: Control<T>;
  name: Path<T>;
  label: ReactNode;
  noneLabel: string;
  options: NamedEntity[] | undefined;
}) {
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <EntitySelect
              value={field.value === NONE_VALUE ? null : field.value}
              onChange={(id) => field.onChange(id ?? NONE_VALUE)}
              noneLabel={props.noneLabel}
              options={props.options}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
