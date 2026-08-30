export type DetectionRuleId =
  "coding-tool" | "scam" | "cjk-leak" | "mux" | "foreign" | "tier-mismatch";

export const DETECTION_RULES: readonly DetectionRuleId[] = [
  "coding-tool",
  "scam",
  "cjk-leak",
  "mux",
  "foreign",
  "tier-mismatch",
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
