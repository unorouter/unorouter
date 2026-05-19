"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { useSubscriptionSelfQuery } from "@/hooks/billing/billing-hook";
import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { chatModelAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";

export function useChatGate() {
  const token = useApiKey();
  const authQuery = useAuthQuery();
  const subQuery = useSubscriptionSelfQuery();
  const selectedModel = useAtomValue(chatModelAtom);
  const pricingData = usePricingQuery().data;
  const isSelectedModelFree =
    pricingData?.models.find((m) => m.name === selectedModel)?.isFree ?? false;

  const hasActiveSubscription = (subQuery.data?.subscriptions ?? []).some(
    (s) => {
      const sub = s.subscription;
      if (!sub || sub.status !== "active") return false;
      if (sub.amount_total <= 0) return true;
      return sub.amount_used < sub.amount_total;
    },
  );

  const needsToken =
    token.isLoggedIn && token.needsToken && !isSelectedModelFree;
  const hasZeroBalance =
    token.isLoggedIn &&
    !token.needsToken &&
    !isSelectedModelFree &&
    !hasActiveSubscription &&
    (authQuery.data?.quota ?? 0) <= 0;

  return { needsToken, hasZeroBalance };
}
