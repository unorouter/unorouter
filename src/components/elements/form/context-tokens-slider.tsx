"use client";

import { Slider } from "@/components/ui/slider";
import { formatTokenCount } from "@/lib/utils/format/number";
import { useLocale, useTranslations } from "next-intl";

// Stops, not a linear track: between 4k and 2M a linear slider has no room for
// the sizes people actually pick. The last stop means "no cap".
const STOPS = [
  4_096, 8_192, 16_384, 32_768, 65_536, 131_072, 200_000, 262_144, 524_288,
  1_000_000, 2_000_000,
] as const;

export function ContextTokensSlider(props: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const at = props.value == null ? STOPS.length : nearest(props.value);
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground text-xs tabular-nums">
        {props.value == null
          ? t("CHAT.OVERRIDES.CONTEXT_TOKENS_MODEL_MAX")
          : t("CHAT.OVERRIDES.CONTEXT_TOKENS_VALUE", {
              tokens: formatTokenCount(props.value, locale),
            })}
      </div>
      <Slider
        min={0}
        max={STOPS.length}
        step={1}
        value={[at]}
        onValueChange={(v) => {
          const i = Array.isArray(v) ? v[0] : v;
          props.onChange(i == null || i >= STOPS.length ? null : STOPS[i]!);
        }}
      />
    </div>
  );
}

function nearest(value: number): number {
  let best = 0;
  for (let i = 0; i < STOPS.length; i++) {
    if (Math.abs(STOPS[i]! - value) < Math.abs(STOPS[best]! - value)) best = i;
  }
  return best;
}
