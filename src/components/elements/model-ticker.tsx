"use client";

import { usePricingQuery } from "@/hooks/pricing-hook";
import { useLiveStats } from "@/hooks/stats-hook";
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
  const { tps } = useLiveStats();
  const models = data?.models ?? [];

  if (models.length === 0) return null;

  const tripled = [...models, ...models, ...models];

  return (
    <div
      className={cn(
        "border-border bg-background relative z-10 hidden border-t py-5 md:flex",
        props.className,
      )}
    >
      <div className="mx-auto flex w-full max-w-360 items-center gap-6">
        {/* Live indicator */}
        <div className="text-foreground border-border bg-secondary flex shrink-0 items-center gap-3 border px-3 py-1 font-mono text-xs font-medium tracking-widest uppercase">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
          <span>{t("HOME.TICKER_LIVE_INFERENCE")}</span>
        </div>

        {/* Scrolling models */}
        <div className="relative flex-1 overflow-hidden">
          <div className="animate-marquee flex gap-6 font-mono text-xs whitespace-nowrap">
            {tripled.map((model, i) => {
              const icon = getVendorIcon(model.vendor.name);
              return (
                <div
                  key={`${model.name}-${i}`}
                  className="flex cursor-default items-center gap-3 opacity-60 transition-opacity hover:opacity-100"
                >
                  {icon && (
                    <Image
                      src={icon}
                      alt={model.vendor.name}
                      width={16}
                      height={16}
                      className="h-4 w-4 rounded object-contain invert dark:invert-0"
                    />
                  )}
                  <span className="text-foreground text-[11px] font-medium tracking-wide uppercase">
                    {model.name}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Fade edges */}
          <div className="from-background pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r to-transparent" />
          <div className="from-background pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l to-transparent" />
        </div>

        {/* TPS counter */}
        <div className="text-foreground/70 shrink-0 font-mono text-xs font-medium">
          <span>{t("HOME.TICKER_TPS")}</span>:{" "}
          <span className="text-foreground font-bold">{tps}</span>
        </div>
      </div>
    </div>
  );
}
