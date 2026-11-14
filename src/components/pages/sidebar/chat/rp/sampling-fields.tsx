"use client";

import { Button } from "@/components/ui/button";
import type { ModelMetadata } from "@/openapi";
import { useTranslations } from "next-intl";
import { Controller, useFormContext } from "react-hook-form";
import { Icon } from "@/components/ui/icon";
import { NumberKnob } from "@/components/ui/number-knob";
import { InfoPopover } from "@/components/ui/popover";
import {
  SAMPLING_PARAMS,
  type SamplingFieldName,
} from "@/lib/validation/rp-forms";

export function SamplingFields(props: { metadata?: ModelMetadata }) {
  const t = useTranslations();
  const form = useFormContext<Record<SamplingFieldName, number | null>>();

  const supported = props.metadata?.supportedParameters;
  const maxTokensCap = props.metadata?.maxOutputTokens;
  const isUnsupported = (apiKey: string): boolean => {
    if (!supported || supported.length === 0) return false;
    if (apiKey === "max_tokens") {
      return (
        !supported.includes("max_tokens") &&
        !supported.includes("max_completion_tokens")
      );
    }
    return !supported.includes(apiKey);
  };
  const unsupportedReason = t("CHAT.SAMPLING.UNSUPPORTED");
  const offReason = t("CHAT.SAMPLING.OFF");

  return (
    <div className="flex flex-col gap-4 rounded-md border p-4">
      <div className="flex items-center justify-between">
        <span className="text-foreground text-sm font-medium">
          {t("CHAT.OVERRIDES.SAMPLING")}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          onClick={() => {
            for (const param of SAMPLING_PARAMS)
              form.setValue(param.field, null, { shouldDirty: true });
          }}
        >
          <Icon name="rotate-ccw" className="size-3.5" />
          {t("COMMON.RESET")}
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {SAMPLING_PARAMS.map((param) => {
          const disabled = isUnsupported(param.apiKey);
          // The cap moves the slider max in BOTH directions, never only downward.
          const hasCap = param.apiKey === "max_tokens" && maxTokensCap != null;
          const fieldMax = hasCap ? maxTokensCap : param.max;
          const label =
            hasCap && maxTokensCap !== param.max
              ? t("RP.SAMPLING_MAX_TOKENS_CAP", {
                  cap: maxTokensCap.toLocaleString(),
                })
              : t(param.labelKey);
          return (
            <Controller
              key={param.field}
              control={form.control}
              name={param.field}
              render={({ field }) => (
                <NumberKnob
                  label={label}
                  info={
                    <InfoPopover
                      text={t(param.hintKey)}
                      details={t(param.exampleKey)}
                      detailsLabel={t("RP.SAMPLING_ADVANCED")}
                    />
                  }
                  value={field.value}
                  onChange={field.onChange}
                  min={param.min}
                  max={fieldMax}
                  step={"step" in param ? param.step : undefined}
                  fallback={param.fallback}
                  disabled={disabled}
                  disabledReason={disabled ? unsupportedReason : undefined}
                  toggleable
                  toggleReason={offReason}
                />
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
