"use client";

import { useModelProviderConsentsQuery } from "@/hooks/auth/provider-consent-hook";
import type { OwnPurposeModel } from "@/lib/api/own-purpose";
import { ProviderConsentItemStatus } from "@/openapi";

// A model the gateway requires a consent for is covered by provider consents.
// `demanded` is a gateway refusal for a model the catalog did not flag.
export function useModelConsentGate(
  model: OwnPurposeModel | undefined,
  name: string | null,
  demanded: boolean,
) {
  const consentModel =
    (model?.own_purpose?.consent_required ?? false) || demanded;
  const query = useModelProviderConsentsQuery(name, consentModel);

  // A stale "not covered" with nothing left to consent to would be a dead end,
  // so the gateway gets the final word then.
  const needsConsent =
    name !== null &&
    query.data?.covered === false &&
    (query.data.providers ?? []).some(
      (p) => p.status === ProviderConsentItemStatus.missing,
    );

  return { consentModel, needsConsent };
}
