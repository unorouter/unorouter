"use client";

import { LuCheck, LuZap } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  name: string;
  price: number;
  value: number;
  multiplier: string;
  features: string[];
  popular?: boolean;
  cta: string;
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
        <div className="absolute -top-3 left-6 rounded-sm border border-foreground/30 bg-foreground/10 px-3 py-1">
          <span className="text-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
            {t("PRICING.CARD_POPULAR")}
          </span>
        </div>
      )}

      <h3 className="text-foreground font-mono text-sm font-bold tracking-wide uppercase">
        {props.name}
      </h3>

      <div className="mt-5 flex items-baseline gap-1.5">
        <span className="text-foreground text-4xl font-bold tracking-tight">
          ${props.price}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          {t("PRICING.CARD_PER_MONTH")}
        </span>
      </div>

      <p className="text-muted-foreground mt-2 font-mono text-[11px]">
        {t("PRICING.CARD_VALUE", { value: `$${props.value}` })} &middot;{" "}
        {t("PRICING.CARD_MULTIPLIER", { multiplier: props.multiplier })}
      </p>

      <div className="border-border mt-6 border-t pt-6">
        <p className="text-muted-foreground mb-4 font-mono text-[10px] tracking-widest uppercase">
          {t("PRICING.CARD_INCLUDES")}
        </p>
        <ul className="space-y-3">
          {props.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2.5 font-mono text-xs"
            >
              <LuCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-auto pt-8">
        <a
          href="https://api.unorouter.ai/register"
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 font-mono text-xs font-bold tracking-widest uppercase transition-colors",
            props.popular
              ? "bg-primary text-primary-foreground hover:bg-primary/80"
              : "border-border text-foreground hover:border-foreground border bg-transparent",
          )}
        >
          {props.popular && <LuZap className="h-3.5 w-3.5" />}
          {props.cta}
        </a>
      </div>

      {props.popular && (
        <div className="absolute -inset-px -z-10 rounded-lg bg-foreground/5 blur-xl" />
      )}
    </div>
  );
}
