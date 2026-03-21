"use client";

import { LuCheck, LuShell, LuZap } from "react-icons/lu";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  name: string;
  price: number;
  value: number;
  multiplier: string;
  quotaLabel: string;
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
        <div className="border-foreground/30 bg-foreground/10 absolute -top-3 left-6 rounded-sm border px-3 py-1">
          <span className="text-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
            {t("PRICING.CARD_POPULAR")}
          </span>
        </div>
      )}

      {/* Price hero */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-foreground text-4xl font-bold tracking-tight">
          ${props.price}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          {t("PRICING.CARD_PER_MONTH")}
        </span>
      </div>

      {/* Spec rows */}
      <div className="mt-5 space-y-4">
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("PRICING.CARD_SPEC_CREDIT")}
          </p>
          <p className="text-foreground text-lg font-bold tracking-tight">
            ${props.value}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("PRICING.CARD_SPEC_QUOTA")}
          </p>
          <p className="text-foreground text-lg font-bold tracking-tight">
            {props.quotaLabel}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            {t("PRICING.CARD_SPEC_MULTIPLIER")}
          </p>
          <p className="text-foreground text-lg font-bold tracking-tight">
            {props.multiplier}
          </p>
        </div>
      </div>

      {/* OpenClaw Support */}
      <div className="mt-6 rounded-sm border border-red-600/20 bg-red-600/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <LuShell className="h-4 w-4 shrink-0 text-red-500" />
          <span className="text-foreground font-mono text-xs font-bold tracking-wide">
            {t("PRICING.CARD_OPENCLAW_TITLE")}
          </span>
        </div>
        <p className="text-muted-foreground mt-1.5 font-mono text-[11px]">
          {t("PRICING.CARD_OPENCLAW_DESC")}
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
              <LuCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500/70" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <div className="mt-auto pt-6">
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL}/register`}
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
        <div className="bg-foreground/5 absolute -inset-px -z-10 rounded-lg blur-xl" />
      )}
    </div>
  );
}
