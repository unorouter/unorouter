"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { cn } from "@/lib/utils";
import type { VerifyProviderValue } from "@/lib/validation/model-tester";
import { useTranslations } from "next-intl";
import type { TranslationKey } from "@/lib/types";

// Ordered by how many models use the format: most makers and relays speak the
// OpenAI chat format, whatever model sits behind it.
const CARDS: {
  value: VerifyProviderValue;
  vendor: string;
  labelKey: TranslationKey;
  makersKey: TranslationKey;
  endpoint: string;
}[] = [
  {
    value: "openai",
    vendor: "openai",
    labelKey: "MODEL_TESTER.PROVIDER.OPENAI",
    makersKey: "MODEL_TESTER.PROVIDER.OPENAI_MAKERS",
    endpoint: "/v1/chat/completions",
  },
  {
    value: "anthropic",
    vendor: "anthropic",
    labelKey: "MODEL_TESTER.PROVIDER.ANTHROPIC",
    makersKey: "MODEL_TESTER.PROVIDER.ANTHROPIC_MAKERS",
    endpoint: "/v1/messages",
  },
  {
    value: "gemini",
    vendor: "google",
    labelKey: "MODEL_TESTER.PROVIDER.GEMINI",
    makersKey: "MODEL_TESTER.PROVIDER.GEMINI_MAKERS",
    endpoint: "/v1beta/.../generateContent",
  },
];

export function ProviderCards(props: {
  value: VerifyProviderValue;
  onChange: (value: VerifyProviderValue) => void;
}) {
  const t = useTranslations();
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {CARDS.map((card) => {
        const active = props.value === card.value;
        return (
          <button
            key={card.value}
            type="button"
            onClick={() => props.onChange(card.value)}
            className={cn(
              "flex min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
              active
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/80 hover:bg-muted/40",
            )}
          >
            <VendorIcon vendor={card.vendor} size={20} className="shrink-0" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {t(card.labelKey)}
              </span>
              <span className="text-muted-foreground line-clamp-2 text-[11px] leading-snug">
                {t(card.makersKey)}
              </span>
              <span className="text-muted-foreground hidden truncate font-mono text-[10px] sm:block">
                {card.endpoint}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
