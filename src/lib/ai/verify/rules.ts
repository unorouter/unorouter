import type { ProbeSignal } from "./types";

// The detection rulebook. ONE entry per hard-fail signal, in the exact order the
// verdict short-circuits (verdict.ts). Each rule is pure data (i18n keys), so the
// transparency UI, the per-probe explanation, and the FAQ all read from here -
// adding a vendor/model never desyncs the copy. The keys live under
// MODEL_TESTER.RULES.<ID> with TITLE / MEANS / WHY / EXCEPTION leaves.
export type DetectionRuleId =
  "coding-tool" | "scam" | "cjk-leak" | "mux" | "foreign" | "tier-mismatch";

export type DetectionRule = {
  id: DetectionRuleId;
  // The probe signal this rule maps to (mux + tier-mismatch are aggregate, not a
  // single ProbeSignal, so they are null here).
  signal: ProbeSignal;
};

// Order matches the hard-fail short-circuit in aggregateVerdict.
export const DETECTION_RULES: readonly DetectionRule[] = [
  { id: "coding-tool", signal: "coding-tool" },
  { id: "scam", signal: "scam" },
  { id: "cjk-leak", signal: "cjk-leak" },
  { id: "mux", signal: null },
  { id: "foreign", signal: "foreign" },
  { id: "tier-mismatch", signal: null },
];

// What does NOT count as fraud. These are the deliberate exceptions baked into
// the verdict so an honest provider is never condemned. Keys under
// MODEL_TESTER.RULES.EXCEPTION.<ID> with TITLE / BODY leaves.
export type DetectionExceptionId =
  "version" | "transient" | "cloud-host" | "reshaping" | "threshold";

export const DETECTION_EXCEPTIONS: readonly DetectionExceptionId[] = [
  "version",
  "transient",
  "cloud-host",
  "reshaping",
  "threshold",
];

// Map a per-probe signal to its rule id for the inline "why did this probe fire"
// explanation in the result card.
export function ruleIdForSignal(signal: ProbeSignal): DetectionRuleId | null {
  if (signal === "coding-tool") return "coding-tool";
  if (signal === "scam") return "scam";
  if (signal === "cjk-leak") return "cjk-leak";
  if (signal === "foreign") return "foreign";
  return null;
}
