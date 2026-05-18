"use client";

import { Button } from "@/components/ui/button";
import type { ModelMetadata } from "@/lib/api/pricing";
import { Controller } from "react-hook-form";
import type { Control, Path } from "react-hook-form";
import { useTranslations } from "next-intl";

import { NumberKnob } from "./number-knob";
import { Icon } from "@/components/ui/icon";

type FieldKey = string;

type SamplingFieldsProps<TForm extends Record<string, unknown>> = {
  control: Control<TForm>;
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
  metadata?: ModelMetadata;
  onReset?: () => void;
};

type KnobSpec<TForm extends Record<string, unknown>> = {
  name: Path<TForm>;
  paramKey:
    | "temperature"
    | "top_p"
    | "top_k"
    | "min_p"
    | "top_a"
    | "frequency_penalty"
    | "presence_penalty"
    | "repetition_penalty"
    | "max_tokens";
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

export function SamplingFields<TForm extends Record<string, unknown>>(
  props: SamplingFieldsProps<TForm>,
) {
  const t = useTranslations();

  const knobs: KnobSpec<TForm>[] = [
    {
      name: props.names.temperature,
      paramKey: "temperature",
      labelKey: "RP.SAMPLING_TEMPERATURE",
      min: 0,
      max: 2,
      fallback: 1,
    },
    {
      name: props.names.topP,
      paramKey: "top_p",
      labelKey: "RP.SAMPLING_TOP_P",
      min: 0,
      max: 1,
      fallback: 1,
    },
    {
      name: props.names.topK,
      paramKey: "top_k",
      labelKey: "RP.SAMPLING_TOP_K",
      min: 0,
      max: 200,
      step: 1,
      fallback: 0,
    },
    {
      name: props.names.frequencyPenalty,
      paramKey: "frequency_penalty",
      labelKey: "RP.SAMPLING_FREQUENCY_PENALTY",
      min: -2,
      max: 2,
      fallback: 0,
    },
    {
      name: props.names.presencePenalty,
      paramKey: "presence_penalty",
      labelKey: "RP.SAMPLING_PRESENCE_PENALTY",
      min: -2,
      max: 2,
      fallback: 0,
    },
    {
      name: props.names.repetitionPenalty,
      paramKey: "repetition_penalty",
      labelKey: "RP.SAMPLING_REPETITION_PENALTY",
      min: 0,
      max: 2,
      fallback: 1,
    },
    {
      name: props.names.minP,
      paramKey: "min_p",
      labelKey: "RP.SAMPLING_MIN_P",
      min: 0,
      max: 1,
      fallback: 0,
    },
    {
      name: props.names.topA,
      paramKey: "top_a",
      labelKey: "RP.SAMPLING_TOP_A",
      min: 0,
      max: 1,
      fallback: 0,
    },
    {
      name: props.names.maxTokens,
      paramKey: "max_tokens",
      labelKey: "RP.SAMPLING_MAX_TOKENS",
      min: 1,
      max: 32_000,
      step: 1,
      fallback: 2048,
    },
  ];

  const supported = props.metadata?.supportedParameters;
  // Gate only when supported set is known; absent metadata enables all (non-OR/pre-sync fallback).
  const isUnsupported = (paramKey: string): boolean => {
    if (!supported || supported.length === 0) return false;
    // OAI variant `max_completion_tokens` also satisfies the max_tokens slider.
    if (paramKey === "max_tokens") {
      return (
        !supported.includes("max_tokens") &&
        !supported.includes("max_completion_tokens")
      );
    }
    return !supported.includes(paramKey);
  };
  const unsupportedReason = t("CHAT.SAMPLING.UNSUPPORTED");

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
            <Icon name="rotate-ccw" className="size-3.5" />
            {t("COMMON.RESET")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {knobs.map((knob) => {
          const disabled = isUnsupported(knob.paramKey);
          return (
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
                  disabled={disabled}
                  disabledReason={disabled ? unsupportedReason : undefined}
                />
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
