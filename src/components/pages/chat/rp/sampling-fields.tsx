"use client";

import { Button } from "@/components/ui/button";
import type { ModelMetadata } from "@/lib/api/pricing";
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
  /**
   * Optional model metadata. When `supportedParameters` is present, knobs
   * for params NOT in that list are grayed out with a tooltip. When the
   * metadata is absent (older sync, non-OR model), all knobs stay enabled.
   */
  metadata?: ModelMetadata;
  /** Optional: render a Reset button that nulls all knobs. */
  onReset?: () => void;
};

type KnobSpec<TForm extends Record<string, unknown>> = {
  name: Path<TForm>;
  /** OR-style sampler name; matched against metadata.supportedParameters. */
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
  // We only gate when we *know* the supported set. Absent metadata = enable
  // everything (graceful fallback for non-OR models / pre-sync data).
  const isUnsupported = (paramKey: string): boolean => {
    if (!supported || supported.length === 0) return false;
    // max_tokens has an OAI variant `max_completion_tokens`; treat either as
    // satisfying the max_tokens slider.
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
            <LuRotateCcw className="size-3.5" />
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
