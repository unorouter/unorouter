import type { ProbeSignal } from "./types";

export type DetectionRuleId =
  "coding-tool" | "scam" | "cjk-leak" | "mux" | "foreign" | "tier-mismatch";

export type DetectionRule = {
  id: DetectionRuleId;
  signal: ProbeSignal;
};

export const DETECTION_RULES: readonly DetectionRule[] = [
  { id: "coding-tool", signal: "coding-tool" },
  { id: "scam", signal: "scam" },
  { id: "cjk-leak", signal: "cjk-leak" },
  { id: "mux", signal: null },
  { id: "foreign", signal: "foreign" },
  { id: "tier-mismatch", signal: null },
];

export type DetectionExceptionId =
  "version" | "transient" | "cloud-host" | "reshaping" | "threshold";

export const DETECTION_EXCEPTIONS: readonly DetectionExceptionId[] = [
  "version",
  "transient",
  "cloud-host",
  "reshaping",
  "threshold",
];

export function ruleIdForSignal(signal: string): DetectionRuleId | null {
  if (signal === "coding-tool") return "coding-tool";
  if (signal === "scam") return "scam";
  if (signal === "cjk-leak") return "cjk-leak";
  if (signal === "foreign") return "foreign";
  return null;
}
