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

      // Gate only once inputs settled: chatModelAtom is null on first render and pricing may still hydrate; treating either as paid flashed the gate on reload.
  const inputsSettled = selectedModel != null && pricingData != null;
  const needsToken =
    token.isLoggedIn &&
    token.needsToken &&
    inputsSettled &&
    !isSelectedModelFree;

  return { needsToken };
}
