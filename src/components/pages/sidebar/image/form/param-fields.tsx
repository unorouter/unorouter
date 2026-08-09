"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ImageFormValues } from "@/lib/validation/image";
import { useTranslations } from "next-intl";
import { useFormContext, type Control, type FieldPath } from "react-hook-form";
import { LabeledSlider } from "../fields/labeled-slider";

type NumberParamPath = FieldPath<ImageFormValues>;

export function SliderParamField(props: {
  control: Control<ImageFormValues>;
  name: NumberParamPath;
  label: string;
  min: number;
  max: number;
  step: number;
  /** Shown (and used) while the field itself is unset. */
  defaultValue: number;
}) {
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          {/* LabeledSlider renders its own label row. */}
          <FormControl>
            <LabeledSlider
              label={props.label}
              min={props.min}
              max={props.max}
              step={props.step}
              value={
                typeof field.value === "number"
                  ? field.value
                  : props.defaultValue
              }
              onChange={field.onChange}
              withInput
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export function SelectParamField(props: {
  name: "params.quality" | "params.outputFormat";
  choices: readonly string[];
  label: string;
  placeholder: string;
}) {
  const form = useFormContext<ImageFormValues>();
  return (
    <FormField
      control={form.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <Select
              value={field.value ?? ""}
              onValueChange={(v) => field.onChange(v || undefined)}
            >
              <SelectTrigger aria-label={props.label} className="w-full">
                <SelectValue placeholder={props.placeholder} />
              </SelectTrigger>
              <SelectContent>
                {props.choices.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
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

export function SeedField() {
  const t = useTranslations();
  const form = useFormContext<ImageFormValues>();
  return (
    <FormField
      control={form.control}
      name="params.seed"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("IMAGE.SEED_LABEL")}</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input
                type="number"
                placeholder="auto"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? undefined : Number(e.target.value),
                  )
                }
              />
            </FormControl>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                field.onChange(Math.floor(Math.random() * 4_000_000_000))
              }
              title={t("IMAGE.SEED_RANDOMIZE")}
            >
              <Icon name="dices" />
            </Button>
          </div>
        </FormItem>
      )}
    />
  );
}
