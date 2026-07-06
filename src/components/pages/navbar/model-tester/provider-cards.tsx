"use client";

import { VendorIcon } from "@/components/elements/brand/vendor-icon";
import { cn } from "@/lib/utils";
import {
  VERIFY_PROVIDERS,
  type VerifyProviderValue,
} from "@/lib/validation/model-tester";
import { useTranslations } from "next-intl";
import type { TranslationKey } from "@/lib/types";

const CARDS: {
  value: VerifyProviderValue;
  vendor: string;
  labelKey: TranslationKey;
  endpoint: string;
}[] = [
  {
    value: "anthropic",
    vendor: "anthropic",
    labelKey: "MODEL_TESTER.PROVIDER.ANTHROPIC",
    endpoint: "/v1/messages",
  },
  {
    value: "openai",
    vendor: "openai",
    labelKey: "MODEL_TESTER.PROVIDER.OPENAI",
    endpoint: "/v1/chat/completions",
  },
  {
    value: "gemini",
    vendor: "google",
    labelKey: "MODEL_TESTER.PROVIDER.GEMINI",
    endpoint: "/v1beta/.../generateContent",
  },
];

export function ProviderCards(props: {
  value: VerifyProviderValue;
  onChange: (value: VerifyProviderValue) => void;
}) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-3 gap-2">
      {CARDS.map((card) => {
        const active = props.value === card.value;
        return (
          <button
            key={card.value}
            type="button"
            onClick={() => props.onChange(card.value)}
            className={cn(
              "flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
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

export { VERIFY_PROVIDERS };
