"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";

type Props = {
  name: string;
  price: number;
  value: number;
  multiplier: string;
  quotaLabel: string;
  features: string[];
  popular?: boolean;
  cta: string;
  onSubscribe?: () => void;
};

export function PricingCard(props: Props) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "bg-card group relative flex flex-col rounded-lg border p-6 transition-all",
        props.popular
          ? "border-foreground/50"
          : "border-border hover:border-foreground/30",
      )}
    >
      {props.popular && (
        <div className="bg-card border-foreground/30 absolute -top-4.5 left-1/2 z-10 -translate-x-1/2 rounded-sm border px-3 py-1 shadow-[0_4px_0_var(--color-card)]">
          <span className="text-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
            {t("PRICING.CARD.POPULAR")}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          {props.name}
        </h2>
        <span className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
          {props.multiplier} {t("PRICING.CARD.VALUE_BADGE")}
        </span>
      </div>

      {/* Price hero: paid -> credit value */}
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-muted-foreground decoration-muted-foreground/60 text-2xl font-bold tracking-tight line-through">
          ${props.price}
        </span>
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="text-muted-foreground/70 h-4 w-4 self-center"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
        <span className="text-foreground text-4xl font-bold tracking-tight">
          ${props.value}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          {t("PRICING.CARD.PER_MONTH")}
        </span>
      </div>
      <p className="text-muted-foreground mt-1.5 font-mono text-[11px] leading-relaxed">
        {t("PRICING.CARD.VALUE_EXPLAIN", {
          paid: `$${props.price}`,
          credit: `$${props.value}`,
        })}
      </p>

      {/* Spec row */}
      <div className="mt-5">
        <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
          {t("PRICING.CARD.SPEC_QUOTA")}
        </p>
        <p className="text-foreground text-lg font-bold tracking-tight">
          {props.quotaLabel}
        </p>
      </div>

      {/* Features */}
      <div className="border-border mt-6 border-t pt-6">
        <ul className="space-y-3">
          {props.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2.5 font-mono text-xs"
            >
              <Icon name="check" className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={props.onSubscribe}
          className={cn(
            "flex h-11 w-full cursor-pointer items-center justify-center gap-2 font-mono text-xs font-bold tracking-widest uppercase transition-colors",
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
        <div className="bg-foreground/5 absolute -inset-px -z-10 rounded-lg blur-xl" />
      )}
    </div>
  );
}
