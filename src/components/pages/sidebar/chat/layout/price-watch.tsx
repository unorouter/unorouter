"use client";

import { usePricingCatalogQuery } from "@/hooks/models/pricing-hook";
import { useHydrated } from "@/hooks/ui/use-hydrated";
import { blendedPrice } from "@/lib/ai/chat/best-deal";
import {
  bestDealDialogOpenAtom,
  chatModelAtom,
  priceSeenAtom,
} from "@/store/chat-store";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { toast } from "sonner";

const PRICE_JUMP = 2;

// Discounts end without notice, so a model picked at 97% off can quietly cost
// thirty times more a week later. Remembers the lowest price each model was
// used at and warns once when it climbs past PRICE_JUMP times that.
export function PriceWatch() {
  const t = useTranslations();
  const hydrated = useHydrated();
  const model = useAtomValue(chatModelAtom);
  const models = usePricingCatalogQuery().data?.models;
  const [seen, setSeen] = useAtom(priceSeenAtom);
  const openBestDeal = useSetAtom(bestDealDialogOpenAtom);

  useEffect(() => {
    if (!hydrated || !model) return;
    const row = models?.find((m) => m.model_name === model);
    const now = row ? blendedPrice(row) : null;
    if (now === null) return;
    const before = seen[model];
    if (before === undefined || now < before) {
      setSeen({ ...seen, [model]: now });
      return;
    }
    const jumped = before === 0 ? now > 0 : now >= before * PRICE_JUMP;
    if (!jumped) return;
    setSeen({ ...seen, [model]: now });
    toast.warning(t("CHAT.PRICE_ALARM.TITLE", { model }), {
      id: `price-alarm-${model}`,
      description:
        before === 0
          ? t("CHAT.PRICE_ALARM.DESC_FREE")
          : t("CHAT.PRICE_ALARM.DESC", { times: Math.round(now / before) }),
      duration: 20_000,
      action: {
        label: t("CHAT.BEST_DEAL.TITLE"),
        onClick: () => openBestDeal(true),
      },
    });
  }, [hydrated, model, models, seen, setSeen, openBestDeal, t]);

  return null;
}
