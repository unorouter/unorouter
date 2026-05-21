"use client";

import { usePricingQuery } from "@/hooks/models/pricing-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { chatModelAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";

export function useChatGate() {
  const token = useApiKey();
  const selectedModel = useAtomValue(chatModelAtom);
  const pricingData = usePricingQuery().data;
  const isSelectedModelFree =
    pricingData?.models.find((m) => m.name === selectedModel)?.isFree ?? false;

  const needsToken =
    token.isLoggedIn && token.needsToken && !isSelectedModelFree;

  return { needsToken };
}
