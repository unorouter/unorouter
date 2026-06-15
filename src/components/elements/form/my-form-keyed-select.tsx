"use client";

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
import type { TranslationKey } from "@/lib/types";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Control, FieldValues, Path } from "react-hook-form";

    // Select bound to a string field whose values map 1:1 to translation keys; leadingOptions render sentinels with no mapped key.
export function MyFormKeyedSelect<T extends FieldValues>(props: {
  control: Control<T>;
  name: Path<T>;
  label: ReactNode;
  fallback: string;
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
                onValueChange={(v) => field.onChange(v ?? props.fallback)}
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
