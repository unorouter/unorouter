import { msg } from "@/lib/config/constants";
import type { OwnPurposeSummary } from "@/openapi";

export type OwnPurposeModel = {
  model_name: string;
  own_purpose?: OwnPurposeSummary;
};

export function usesInputsForOwnPurposes(model: OwnPurposeModel): boolean {
  return model.own_purpose?.trains_or_retains ?? false;
}

export const OWN_PURPOSE_OBJECTED = "own_purpose_objected";

export const CONSENT_REQUIRED = "consent_required";

const GATEWAY_CODE_MESSAGES = {
  [OWN_PURPOSE_OBJECTED]: msg("OWN_PURPOSE.OBJECTED_ERROR"),
  [CONSENT_REQUIRED]: msg("CONSENT.REQUIRED_ERROR"),
  consent_business: msg("CONSENT.BUSINESS"),
} as const;

function isMappedCode(
  code: string,
): code is keyof typeof GATEWAY_CODE_MESSAGES {
  return Object.hasOwn(GATEWAY_CODE_MESSAGES, code);
}

export function gatewayCodeMessage(code: string | null | undefined) {
  return code && isMappedCode(code) ? GATEWAY_CODE_MESSAGES[code] : null;
}
