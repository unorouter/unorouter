"use client";

import { clamp } from "@/lib/utils/base";

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
import { Slider } from "@/components/ui/slider";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { CLIP_TOKEN_CAP } from "../playground-constants";

export function QualityField(props: {
  choices: readonly string[];
  label: string;
  placeholder: string;
}) {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name="params.quality"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <Select
              value={(field.value as string | undefined) ?? ""}
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

export function OutputFormatField(props: {
  choices: readonly string[];
  label: string;
  placeholder: string;
}) {
  const form = useFormContext();
  return (
    <FormField
      control={form.control}
      name="params.outputFormat"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <Select
              value={(field.value as string | undefined) ?? ""}
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

export function SliderParamField(props: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic RHF control across param forms
  control: any;
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}) {
  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <SliderWithInput
              label={props.label}
              min={props.min}
              max={props.max}
              step={props.step}
              value={props.value}
              onChange={field.onChange}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

export function SliderWithInput(props: {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Slider
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step}
        value={[props.value]}
        onValueChange={(next) =>
          props.onChange(Array.isArray(next) ? next[0] : next)
        }
        className="flex-1"
      />
      <Input
        type="number"
        aria-label={props.label}
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return;
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) props.onChange(parsed);
        }}
        onBlur={(e) => {
          const parsed = Number(e.target.value);
          if (Number.isFinite(parsed))
            props.onChange(clamp(parsed, props.min, props.max));
        }}
        className="w-20 shrink-0 text-center"
      />
    </div>
  );
}

const clipTokenizerPromise = import("@huggingface/transformers").then((m) =>
  m.CLIPTokenizer.from_pretrained("Xenova/clip-vit-base-patch32"),
);

export function TokenEstimate(props: { text: string; family: string }) {
  const t = useTranslations();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!props.text) return;
    let alive = true;
    clipTokenizerPromise
      .then((tok) => {
        if (alive) setCount(tok.encode(props.text).length);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [props.text]);
  const trimmed = props.text.trim();
  if (!trimmed || count === 0) return null;
  const showCap = props.family === "sdxl";
  const over = showCap && count > CLIP_TOKEN_CAP;
  return (
    <p
      className={
        over
          ? "mt-1 text-xs text-amber-700 dark:text-amber-400"
          : "text-muted-foreground mt-1 text-xs"
      }
    >
      {showCap
        ? t("IMAGE.TOKEN_COUNT_CAPPED", { count, cap: CLIP_TOKEN_CAP })
        : t("IMAGE.TOKEN_COUNT", { count })}
    </p>
  );
}

export function SeedField() {
  const t = useTranslations();
  const form = useFormContext();
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
                value={(field.value as number | undefined) ?? ""}
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
