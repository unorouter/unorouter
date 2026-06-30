"use client";

import { Button } from "@/components/ui/button";
import type { ModelMetadata } from "@/lib/api/pricing";
import { useTranslations } from "next-intl";
import type { Control, Path } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Icon } from "@/components/ui/icon";
import { NumberKnob } from "@/components/ui/number-knob";
import {
  SAMPLING_PARAMS,
  type SamplingFieldName,
} from "@/lib/validation/rp-forms";

type SamplingFieldsProps<TForm extends Record<string, unknown>> = {
  control: Control<TForm>;
  // Maps each sampling field to its path in the host form.
  names: Record<SamplingFieldName, Path<TForm>>;
  metadata?: ModelMetadata;
  // The active model's EFFECTIVE output cap (model maxOutputTokens, or the free/unknown cap). When set, the
  // max_tokens slider is clamped to it + the label shows it, so a "maxed" value reflects what actually applies
  // at request time (free models cap at 8192, unknown at 4096) instead of a misleading higher number.
  maxTokensCap?: number;
  onReset?: () => void;
};

export function SamplingFields<TForm extends Record<string, unknown>>(
  props: SamplingFieldsProps<TForm>,
) {
  const t = useTranslations();

  const supported = props.metadata?.supportedParameters;
  // Gate only when supported set is known; absent metadata enables all (non-OR/pre-sync fallback).
  const isUnsupported = (apiKey: string): boolean => {
    if (!supported || supported.length === 0) return false;
    // OAI variant `max_completion_tokens` also satisfies the max_tokens slider.
    if (apiKey === "max_tokens") {
      return (
        !supported.includes("max_tokens") &&
        !supported.includes("max_completion_tokens")
      );
    }
    return !supported.includes(apiKey);
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
        {SAMPLING_PARAMS.map((param) => {
          const disabled = isUnsupported(param.apiKey);
          // Clamp the max_tokens slider to the model's effective output cap + show it in the label.
          const capped =
            param.apiKey === "max_tokens" &&
            props.maxTokensCap != null &&
            props.maxTokensCap < param.max;
          const fieldMax = capped ? props.maxTokensCap! : param.max;
          const label = capped
            ? t("RP.SAMPLING_MAX_TOKENS_CAP", {
                cap: props.maxTokensCap!.toLocaleString(),
              })
            : t(param.labelKey);
          return (
            <Controller
              key={param.field}
              control={props.control}
              name={props.names[param.field]}
              render={({ field }) => (
                <NumberKnob
                  label={label}
                  value={(field.value as number | null) ?? null}
                  onChange={field.onChange}
                  min={param.min}
                  max={fieldMax}
                  step={"step" in param ? param.step : undefined}
                  fallback={param.fallback}
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
