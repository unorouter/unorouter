"use client";

import { Button } from "@/components/ui/button";
import { Controller } from "react-hook-form";
import type { Control, Path } from "react-hook-form";
import { useTranslations } from "next-intl";
import { LuRotateCcw } from "react-icons/lu";
import { NumberKnob } from "./number-knob";

type FieldKey = string;

type SamplingFieldsProps<TForm extends Record<string, unknown>> = {
  control: Control<TForm>;
  /** Map of form field names by sampling knob. */
  names: {
    temperature: Path<TForm>;
    topP: Path<TForm>;
    topK: Path<TForm>;
    minP: Path<TForm>;
    topA: Path<TForm>;
    frequencyPenalty: Path<TForm>;
    presencePenalty: Path<TForm>;
    repetitionPenalty: Path<TForm>;
    maxTokens: Path<TForm>;
  };
  /** Optional: render a Reset button that nulls all knobs. */
  onReset?: () => void;
};

type KnobSpec<TForm extends Record<string, unknown>> = {
  name: Path<TForm>;
  labelKey:
    | "RP.SAMPLING_TEMPERATURE"
    | "RP.SAMPLING_TOP_P"
    | "RP.SAMPLING_TOP_K"
    | "RP.SAMPLING_MIN_P"
    | "RP.SAMPLING_TOP_A"
    | "RP.SAMPLING_FREQUENCY_PENALTY"
    | "RP.SAMPLING_PRESENCE_PENALTY"
    | "RP.SAMPLING_REPETITION_PENALTY"
    | "RP.SAMPLING_MAX_TOKENS";
  min: number;
  max: number;
  step?: number;
  fallback: number;
};

/**
 * Openrouter-style sampling block. Sliders are always visible. Each knob
 * stores `null` when "off" but the slider still has a visible position from
 * `fallback`. Edits set the field to a real number.
 *
 * Reuse this for both the per-conversation overrides drawer and the named
 * preset editor.
 */
export function SamplingFields<TForm extends Record<string, unknown>>(
  props: SamplingFieldsProps<TForm>,
) {
  const t = useTranslations();

  const knobs: KnobSpec<TForm>[] = [
    {
      name: props.names.temperature,
      labelKey: "RP.SAMPLING_TEMPERATURE",
      min: 0,
      max: 2,
      fallback: 1,
    },
    {
      name: props.names.topP,
      labelKey: "RP.SAMPLING_TOP_P",
      min: 0,
      max: 1,
      fallback: 1,
    },
    {
      name: props.names.topK,
      labelKey: "RP.SAMPLING_TOP_K",
      min: 0,
      max: 200,
      step: 1,
      fallback: 0,
    },
    {
      name: props.names.frequencyPenalty,
      labelKey: "RP.SAMPLING_FREQUENCY_PENALTY",
      min: -2,
      max: 2,
      fallback: 0,
    },
    {
      name: props.names.presencePenalty,
      labelKey: "RP.SAMPLING_PRESENCE_PENALTY",
      min: -2,
      max: 2,
      fallback: 0,
    },
    {
      name: props.names.repetitionPenalty,
      labelKey: "RP.SAMPLING_REPETITION_PENALTY",
      min: 0,
      max: 2,
      fallback: 1,
    },
    {
      name: props.names.minP,
      labelKey: "RP.SAMPLING_MIN_P",
      min: 0,
      max: 1,
      fallback: 0,
    },
    {
      name: props.names.topA,
      labelKey: "RP.SAMPLING_TOP_A",
      min: 0,
      max: 1,
      fallback: 0,
    },
    {
      name: props.names.maxTokens,
      labelKey: "RP.SAMPLING_MAX_TOKENS",
      min: 1,
      max: 32_000,
      step: 1,
      fallback: 2048,
    },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm font-medium">
          {t("CHAT.OVERRIDES.SAMPLING")}
        </span>
        {props.onReset && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={props.onReset}
          >
            <LuRotateCcw className="size-3.5" />
            {t("COMMON.RESET")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {knobs.map((knob) => (
          <Controller
            key={knob.name as FieldKey}
            control={props.control}
            name={knob.name}
            render={({ field }) => (
              <NumberKnob
                label={t(knob.labelKey)}
                value={(field.value as number | null) ?? null}
                onChange={field.onChange}
                min={knob.min}
                max={knob.max}
                step={knob.step}
                fallback={knob.fallback}
              />
            )}
          />
        ))}
      </div>
    </div>
  );
}
