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

      // Gate only once its inputs settled: chatModelAtom is null on first client render and pricing may still be hydrating; treating either as paid flashed the gate on every reload for keyless free-model accounts.
  const inputsSettled = selectedModel != null && pricingData != null;
  const needsToken =
    token.isLoggedIn &&
    token.needsToken &&
    inputsSettled &&
    !isSelectedModelFree;

  return { needsToken };
}
