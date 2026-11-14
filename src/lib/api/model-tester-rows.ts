import type { Checks, ProbeOutcome, VerifyResult } from "ai-model-verifier";
import type {
  StoredFinding,
  StoredReports,
  TestResultProbe,
} from "@/lib/api/typebox/model-tester";
import type { testerProbes } from "@/lib/db/schema/tester";

type ProbeRow = typeof testerProbes.$inferSelect;

/**
 * Every check a tester run asks for: the survey carries the sensitive question
 * the fake-200 rule reads, and the instruction replay wrapper-leak reads.
 */
export const TESTER_CHECKS = {
  signature: true,
  tokenTruth: true,
  survey: true,
  thinkingFloor: true,
  tokenizerFamily: true,
  answerFingerprint: true,
} satisfies Checks;

/** A probe's columns, the same in the browser's history and the leaderboard. */
export function probeColumns(p: ProbeOutcome) {
  return {
    label: p.label,
    prompt: p.prompt,
    responseText: p.responseText,
    httpStatus: p.httpStatus,
    pass: p.pass,
    transient: p.transient,
    signal: p.signal,
    reason: p.reason,
    promptTokens: p.usage?.prompt ?? null,
    completionTokens: p.usage?.completion ?? null,
    latencyMs: p.latencyMs,
    finishReason: p.finishReason,
    reasoningTokens: p.reasoning?.reasoning ?? null,
    errorBody: p.errorBody,
  };
}

export function toTestResultProbe(
  p: Pick<ProbeRow, keyof ReturnType<typeof probeColumns>>,
): TestResultProbe {
  return {
    label: p.label,
    pass: p.pass,
    transient: p.transient,
    signal: p.signal,
    reason: p.reason,
    prompt: p.prompt,
    responseText: p.responseText,
    httpStatus: p.httpStatus,
    promptTokens: p.promptTokens,
    completionTokens: p.completionTokens,
    latencyMs: p.latencyMs,
    finishReason: p.finishReason,
    reasoningTokens: p.reasoningTokens,
    errorBody: p.errorBody,
  };
}

export const storedFindings = (r: VerifyResult): StoredFinding[] =>
  r.findings.map((f) => ({
    rule: f.rule,
    layer: f.layer,
    severity: f.severity,
    reason: f.reason,
  }));

export function storedReports(r: VerifyResult): StoredReports {
  return {
    ...(r.signature ? { signature: r.signature } : {}),
    ...(r.tokenTruth ? { tokenTruth: r.tokenTruth } : {}),
    ...(r.thinkingFloor ? { thinkingFloor: r.thinkingFloor } : {}),
    ...(r.thinkingHonored ? { thinkingHonored: r.thinkingHonored } : {}),
    ...(r.tokenizerFingerprint
      ? { tokenizerFingerprint: r.tokenizerFingerprint }
      : {}),
    ...(r.tokenizerFamily ? { tokenizerFamily: r.tokenizerFamily } : {}),
    ...(r.responseMetadata ? { responseMetadata: r.responseMetadata } : {}),
    ...(r.throughput ? { throughput: r.throughput } : {}),
    ...(r.survey ? { survey: r.survey } : {}),
  };
}
