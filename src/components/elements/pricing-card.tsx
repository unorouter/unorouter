"use client";

import { LuCheck } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type Props = {
  name: string;
  price: number;
  value: number;
  multiplier: string;
  rateLimit: number;
  features: string[];
  popular?: boolean;
  cta: string;
};

export function PricingCard(props: Props) {
  const t = useTranslations();

  return (
    <div
      className={cn(
        "border-border bg-card relative flex flex-col border p-6",
        props.popular && "border-primary"
      )}
    >
      {props.popular && (
        <Badge className="absolute -top-2.5 left-6">
          {t("PRICING.CARD_POPULAR")}
        </Badge>
      )}

      <h3 className="text-lg font-semibold">{props.name}</h3>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-4xl font-bold">${props.price}</span>
        <span className="text-muted-foreground text-sm">{t("PRICING.CARD_PER_MONTH")}</span>
      </div>

      <p className="text-muted-foreground mt-2 text-sm">
        {t("PRICING.CARD_VALUE", { value: `$${props.value}` })} &middot; {t("PRICING.CARD_MULTIPLIER", { multiplier: props.multiplier })}
      </p>

      <div className="border-border mt-6 border-t pt-6">
        <p className="text-muted-foreground mb-3 font-mono text-xs uppercase">
          {t("PRICING.CARD_INCLUDES")}
        </p>
        <ul className="space-y-3">
          <li className="flex items-center gap-2 text-sm">
            <LuCheck className="text-primary h-4 w-4 shrink-0" />
            {t("PRICING.CARD_REQUESTS_MIN", { count: props.rateLimit.toLocaleString() })}
          </li>
          {props.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <LuCheck className="text-primary h-4 w-4 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <Button
          className="w-full"
          variant={props.popular ? "default" : "outline"}
          render={<a href="https://api.unorouter.ai/register" />}
        >
          {props.cta}
        </Button>
      </div>
    </div>
  );
}
