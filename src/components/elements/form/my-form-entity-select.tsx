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
import { NONE_VALUE } from "@/lib/config/constants";
import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

type NamedEntity = { id: string; name: string };

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
            <Select
              value={field.value}
              onValueChange={(v) => field.onChange(v ?? NONE_VALUE)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {field.value === NONE_VALUE
                    ? props.noneLabel
                    : (props.options?.find((o) => o.id === field.value)?.name ??
                      props.noneLabel)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{props.noneLabel}</SelectItem>
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
