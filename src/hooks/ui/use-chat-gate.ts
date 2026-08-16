"use client";

import { useModelBasicsQuery } from "@/hooks/models/pricing-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { chatModelAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";

export function useChatGate() {
  const token = useApiKey();
  const selectedModel = useAtomValue(chatModelAtom);
  const pricingData = useModelBasicsQuery().data;
  const isSelectedModelFree =
    pricingData?.find((m) => m.name === selectedModel)?.isFree ?? false;

  const inputsSettled = selectedModel != null && pricingData != null;
  const needsToken =
    token.isLoggedIn &&
    token.needsToken &&
    inputsSettled &&
    !isSelectedModelFree;

  return { needsToken };
}
