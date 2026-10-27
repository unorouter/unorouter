import type { ProviderConsentItem } from "@/openapi";

// The label (its lane tags, families collapsed) is the public name; the alias
// stays an identifier and only fills in for a gateway without labels.
export function providerName(
  p: Pick<ProviderConsentItem, "label" | "alias">,
): string {
  return p.label || p.alias;
}

export const PRACTICES = ["trains", "retains", "unknown"] as const;
export type Practice = (typeof PRACTICES)[number];

// A gateway without the field only says whether a provider trains or retains.
export function providerPractice(p: {
  practice?: string;
  trains_or_retains: boolean;
}): Practice {
  if (p.practice === "trains" || p.practice === "retains") return p.practice;
  if (p.practice === "unknown") return "unknown";
  return p.trains_or_retains ? "trains" : "unknown";
}
