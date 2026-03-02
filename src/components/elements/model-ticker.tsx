"use client";

import { usePricingQuery } from "@/hooks/pricing-hook";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

type Props = {
  className?: string;
};

const VENDOR_ICONS: Record<string, string> = {
  openai: "/icons/openai.svg",
  anthropic: "/icons/anthropic.svg",
  google: "/icons/google.svg",
  "google deepmind": "/icons/google.svg",
  deepseek: "/icons/deepseek.svg",
  meta: "/icons/meta.svg",
  mistral: "/icons/mistral.svg",
  "mistral ai": "/icons/mistral.svg",
  cohere: "/icons/cohere.svg",
  xai: "/icons/x.svg",
  "x.ai": "/icons/x.svg",
};

function getVendorIcon(vendor: string): string | null {
  const normalized = vendor.toLowerCase();
  for (const [key, icon] of Object.entries(VENDOR_ICONS)) {
    if (normalized.includes(key)) return icon;
  }
  return null;
}

export function ModelTicker(props: Props) {
  const t = useTranslations();
  const { data } = usePricingQuery();
  const models = data?.models ?? [];

  if (models.length === 0) return null;

  const tripled = [...models, ...models, ...models];

  return (
    <div
      className={cn(
        "border-t border-border bg-background py-5 hidden md:flex",
        props.className
      )}
    >
      <div className="max-w-360 mx-auto w-full px-6 flex items-center gap-10">
        {/* Live indicator */}
        <div className="flex items-center gap-3 text-[10px] text-foreground font-mono uppercase tracking-widest border border-border bg-secondary px-3 py-1 shrink-0">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          {t("HOME.TICKER_LIVE_INFERENCE")}
        </div>

        {/* Scrolling models */}
        <div className="flex-1 overflow-hidden relative">
          <div className="flex gap-12 animate-marquee whitespace-nowrap font-mono text-xs">
            {tripled.map((model, i) => {
              const icon = getVendorIcon(model.vendor.name);
              return (
                <div
                  key={`${model.name}-${i}`}
                  className="flex items-center gap-3 opacity-40 hover:opacity-100 transition-opacity cursor-default"
                >
                  {icon && (
                    <Image
                      src={icon}
                      alt={model.vendor.name}
                      width={16}
                      height={16}
                      className="w-4 h-4 rounded object-contain invert dark:invert-0"
                    />
                  )}
                  <span className="text-foreground font-medium tracking-wide text-[11px] uppercase">
                    {model.name}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Fade edges */}
          <div className="absolute inset-y-0 left-0 w-24 bg-linear-to-r from-background to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 bg-linear-to-l from-background to-transparent pointer-events-none" />
        </div>

        {/* TPS counter */}
        <div className="text-[10px] font-mono text-muted-foreground shrink-0">
          {t("HOME.TICKER_TPS")}: <span className="text-foreground font-bold">142.5</span>
        </div>
      </div>
    </div>
  );
}
