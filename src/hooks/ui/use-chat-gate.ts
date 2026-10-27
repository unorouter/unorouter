"use client";

import { useAuthQuery } from "@/hooks/auth/auth-hook";
import { usePricingCatalogQuery } from "@/hooks/models/pricing-hook";
import { useApiKey } from "@/hooks/ui/use-api-key";
import { useModelConsentGate } from "@/hooks/ui/use-model-consent-gate";
import { chatModelAtom, consentDemandedModelsAtom } from "@/store/chat-store";
import { useAtomValue } from "jotai";

export function useChatGate() {
  const token = useApiKey();
  const authQuery = useAuthQuery();
  const selectedModel = useAtomValue(chatModelAtom);
  const pricingData = usePricingCatalogQuery().data?.models;
  const selected = pricingData?.find((m) => m.model_name === selectedModel);
  const isSelectedModelFree = selected?.is_free ?? false;
  const demanded = useAtomValue(consentDemandedModelsAtom);
  const consentGate = useModelConsentGate(
    selected,
    selectedModel,
    selectedModel != null && demanded.includes(selectedModel),
  );

  const inputsSettled = selectedModel != null && pricingData != null;
  const needsToken =
    token.isLoggedIn &&
    token.needsToken &&
    inputsSettled &&
    !isSelectedModelFree;
  const business =
    consentGate.consentModel && authQuery.data?.customer_type === "business";
  const needsConsent = !business && consentGate.needsConsent;

  return { needsToken, needsConsent, business, selectedModel };
}
