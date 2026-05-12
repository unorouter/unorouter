"use client";

import { Button } from "@/components/ui/button";
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
import type { GenerationSubmitBody } from "@/lib/validation/generation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { LuDices } from "react-icons/lu";

// Vendor knob: select-style enum (gpt-image quality, BFL output_format, etc.).
// Choices come from the descriptor; the field leaves params.<key> undefined
// when nothing is picked so the dispatch layer skips the field entirely.
export function QualityField(props: {
  form: UseFormReturn<GenerationSubmitBody>;
  choices: readonly string[];
  label: string;
  placeholder: string;
}) {
  return (
    <FormField
      control={props.form.control}
      name="params.quality"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <Select
              value={(field.value as string | undefined) ?? ""}
              onValueChange={(v) => field.onChange(v || undefined)}
            >
              <SelectTrigger className="w-full">
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
  form: UseFormReturn<GenerationSubmitBody>;
  choices: readonly string[];
  label: string;
  placeholder: string;
}) {
  return (
    <FormField
      control={props.form.control}
      name="params.outputFormat"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{props.label}</FormLabel>
          <FormControl>
            <Select
              value={(field.value as string | undefined) ?? ""}
              onValueChange={(v) => field.onChange(v || undefined)}
            >
              <SelectTrigger className="w-full">
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

// Slider + manual numeric input. Mobile-friendly: dragging a slider on
// small screens is fiddly when fine-grained values matter, so we expose
// the underlying number in a small Input next to the slider track.
// Clamps to [min, max] on blur; partially-typed values are tolerated
// during typing so the user can edit without fighting the field.
export function SliderWithInput(props: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const clamp = (n: number) => Math.min(props.max, Math.max(props.min, n));
  return (
    <div className="flex items-center gap-3">
      <Slider
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
          if (Number.isFinite(parsed)) props.onChange(clamp(parsed));
        }}
        className="w-20 shrink-0 text-center"
      />
    </div>
  );
}

const CLIP_TOKEN_CAP = 77;
let clipTokenizerPromise: Promise<{
  encode: (text: string) => number[];
}> | null = null;

async function getClipTokenizer() {
  if (!clipTokenizerPromise) {
    clipTokenizerPromise = import("@huggingface/transformers").then((mod) =>
      mod.CLIPTokenizer.from_pretrained("Xenova/clip-vit-base-patch32"),
    );
  }
  return clipTokenizerPromise;
}

export function TokenEstimate(props: { text: string; family: string }) {
  const t = useTranslations();
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!props.text) return;
    let alive = true;
    getClipTokenizer()
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
          ? "mt-1 text-xs text-amber-500"
          : "text-muted-foreground mt-1 text-xs"
      }
    >
      {showCap
        ? t("IMAGE.TOKEN_COUNT_CAPPED", { count, cap: CLIP_TOKEN_CAP })
        : t("IMAGE.TOKEN_COUNT", { count })}
    </p>
  );
}

export function SizeField(props: {
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslations();
  return (
    <FormItem>
      <FormLabel>{t("IMAGE.SIZE_LABEL")}</FormLabel>
      <FormControl>
        <Select
          value={props.value}
          onValueChange={(v) => v !== null && props.onChange(v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              "1024x1024",
              "832x1216",
              "1216x832",
              "1024x1536",
              "1536x1024",
            ].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormControl>
    </FormItem>
  );
}

// Seed input + randomize button. Lifted out so it slots cleanly into the
// Sampler/Scheduler/Seed three-column grid (and falls back to a single full-
// width row on Flux 2 where samplers don't apply).
export function SeedField(props: {
  form: UseFormReturn<GenerationSubmitBody>;
}) {
  const t = useTranslations();
  return (
    <FormField
      control={props.form.control}
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
              <LuDices />
            </Button>
          </div>
        </FormItem>
      )}
    />
  );
}
