import type {
  DetectionExceptionId,
  VerdictRuleId,
} from "ai-model-verifier/rules";

const RULE_SEGMENT = {
  "thinking-floor": "THINKING-FLOOR",
  "thinking-honored": "THINKING-HONORED",
  "tokenizer-fingerprint": "TOKENIZER-FINGERPRINT",
  "tokenizer-family": "TOKENIZER-FAMILY",
  "masked-identity": "MASKED-IDENTITY",
  "fake-200": "FAKE-200",
  "censored-history": "CENSORED-HISTORY",
  signature: "SIGNATURE",
  "foreign-answers": "FOREIGN-ANSWERS",
  "coding-tool": "CODING-TOOL",
  scam: "SCAM",
  "cjk-leak": "CJK-LEAK",
  mux: "MUX",
  foreign: "FOREIGN",
  "served-model-mismatch": "SERVED-MODEL-MISMATCH",
  substituted: "SUBSTITUTED",
  quorum: "QUORUM",
} as const satisfies Record<VerdictRuleId, string>;

const EXCEPTION_SEGMENT = {
  version: "VERSION",
  transient: "TRANSIENT",
  "cloud-host": "CLOUD-HOST",
  reshaping: "RESHAPING",
  threshold: "THRESHOLD",
} as const satisfies Record<DetectionExceptionId, string>;

export const ruleKey = (
  id: VerdictRuleId,
  leaf: "TITLE" | "MEANS" | "WHY" | "EXCEPTION",
) => `MODEL_TESTER.RULES.${RULE_SEGMENT[id]}.${leaf}` as const;

export const exceptionKey = (
  id: DetectionExceptionId,
  leaf: "TITLE" | "BODY",
) => `MODEL_TESTER.RULES.EXCEPTION.${EXCEPTION_SEGMENT[id]}.${leaf}` as const;
