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
import type { ReactNode } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";

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
                    <span className="flex min-w-0 items-center gap-2">
                      <RpAvatar
                        mediaId={o.avatarMediaId}
                        name={o.name}
                        className="size-5"
                      />
                      <span className="truncate">{o.name}</span>
                    </span>
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
