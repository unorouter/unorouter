"use client";

import { useAuthQuery } from "@/hooks/auth-hook";
import { usePricingQuery } from "@/hooks/pricing-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { chatModelAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";

export function useChatGate() {
  const token = useApiKey();
  const authQuery = useAuthQuery();
  const selectedModel = useAtomValue(chatModelAtom);
  const pricingData = usePricingQuery().data;
  const isSelectedModelFree = pricingData?.models.find((m) => m.name === selectedModel)?.isFree ?? false;

  const needsToken = token.isLoggedIn && token.needsToken && !isSelectedModelFree;
  const hasZeroBalance = token.isLoggedIn && !token.needsToken && !isSelectedModelFree && (authQuery.data?.quota ?? 0) <= 0;

  return { needsToken, hasZeroBalance };
}
