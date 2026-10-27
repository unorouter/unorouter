import {
  ProviderConsentItemStatus,
  type PricingCatalogModel,
  type ProviderConsentItem,
} from "@/openapi";

export const CONSENT_KINDS = ["consent", "none"] as const;
export type ConsentKind = (typeof CONSENT_KINDS)[number];

export const CONSENT_STATUSES = ["given", "missing"] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number] | "not_needed";

export const PRICE_KINDS = ["paid", "free"] as const;

export type ConsentRow = {
  model: PricingCatalogModel;
  kind: ConsentKind;
  status: ConsentStatus;
  countries: string[];
};

export function buildConsentRows(
  models: PricingCatalogModel[],
  providers: ProviderConsentItem[],
): ConsentRow[] {
  return models.map((model) => {
    const kind = model.own_purpose?.consent_required ? "consent" : "none";
    const serving = providers.filter((p) =>
      (p.models ?? []).includes(model.model_name),
    );
    const given =
      serving.length > 0 &&
      serving.every((p) => p.status === ProviderConsentItemStatus.given);
    const status: ConsentStatus =
      kind === "none" ? "not_needed" : given ? "given" : "missing";
    return {
      model,
      kind,
      status,
      countries: model.own_purpose?.countries ?? [],
    };
  });
}
