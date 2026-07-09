"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";

type Props = {
  name: string;
  price: number;
  value: number;
  deliveryLabel?: string;
  features: string[];
  popular?: boolean;
  cta: string;
  onSubscribe?: () => void;
  disabled?: boolean;
};

export function PricingCard(props: Props) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "bg-card group relative flex flex-col rounded-lg border p-6 transition-all",
        props.popular
          ? "border-emerald-500/50"
          : "border-border hover:border-foreground/30",
      )}
    >
      {props.popular && (
        <div className="bg-card absolute -top-4.5 left-1/2 z-10 -translate-x-1/2 rounded-sm border border-emerald-500/40 px-3 py-1 shadow-[0_4px_0_var(--color-card)]">
          <span className="font-mono text-[10px] tracking-[0.2em] text-emerald-600 uppercase dark:text-emerald-400">
            {t("PRICING.CARD.POPULAR")}
          </span>
        </div>
      )}

      <h2 className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
        {props.name}
      </h2>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-foreground text-4xl font-bold tracking-tight">
          ${props.price}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          {t("PRICING.CARD.PER_MONTH")}
        </span>
      </div>

      <div className="mt-4 flex items-baseline gap-2.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
        <span className="text-3xl font-bold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
          ${props.value}
        </span>
        <span className="font-mono text-[11px] leading-tight tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
          {t("PRICING.CARD.VALUE_HERO")}
        </span>
      </div>

      <p className="text-muted-foreground mt-3 font-mono text-[11px] leading-relaxed">
        {t("PRICING.CARD.VALUE_EXPLAIN", {
          paid: `$${props.price}`,
          credit: `$${props.value}`,
        })}
      </p>

      {props.deliveryLabel && (
        <p className="text-muted-foreground mt-1 font-mono text-[10px] tracking-wide">
          {props.deliveryLabel}
        </p>
      )}

      <div className="border-border mt-6 border-t pt-6">
        <ul className="space-y-3">
          {props.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2.5 font-mono text-xs"
            >
              <Icon
                name="check"
                className="h-3.5 w-3.5 shrink-0 text-emerald-500/70"
              />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={props.onSubscribe}
          disabled={props.disabled}
          className={cn(
            "flex h-11 w-full cursor-pointer items-center justify-center gap-2 font-mono text-xs font-bold tracking-widest uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            props.popular
              ? "bg-primary text-primary-foreground hover:bg-primary/80"
              : "border-border text-foreground hover:border-foreground border bg-transparent",
          )}
        >
          {props.popular && <Icon name="zap" className="h-3.5 w-3.5" />}
          {props.cta}
        </button>
      </div>

      {props.popular && (
        <div className="absolute -inset-px -z-10 rounded-lg bg-emerald-500/5 blur-xl" />
      )}
    </div>
  );
}
