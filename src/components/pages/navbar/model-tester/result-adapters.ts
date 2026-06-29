import type { ResultCardData } from "./test-result-card";
import type { TestDetail } from "@/lib/db/client/data/tester";
import type { VerifyResult } from "@/lib/ai/verify/types";

// Live result from the runner -> card data.
export function fromVerifyResult(r: VerifyResult): ResultCardData {
  return {
    model: r.model,
    baseUrlHost: r.baseUrlHost,
    provider: r.provider,
    verdict: r.verdict,
    reasons: r.reasons,
    versionUnverifiable: r.versionUnverifiable,
    detectedModel: r.detectedModel,
    probesPassed: r.probesPassed,
    probesTotal: r.probesTotal,
    totalTokens: r.totalUsage?.total ?? null,
    latencyMs: r.latencyMs,
    transport: r.transport,
    resolvedFormat: r.resolvedProvider,
    formatFellBack: r.resolvedProvider !== r.provider,
    connectivityError: r.connectivityError,
    probes: r.probes.map((p) => ({
      label: p.label,
      pass: p.pass,
      signal: p.signal,
      reason: p.reason,
      prompt: p.prompt,
      responseText: p.responseText,
      httpStatus: p.httpStatus,
      promptTokens: p.usage?.prompt ?? null,
      completionTokens: p.usage?.completion ?? null,
      latencyMs: p.latencyMs,
    })),
  };
}

// Stored test + probes (history detail) -> card data. The stored test has no
// reasons array, so the evidence line is rebuilt from the failing probes' reason.
export function fromTestDetail(detail: TestDetail): ResultCardData {
  const reasons = detail.probes
    .filter((p) => !p.pass && p.reason)
    .map((p) => `${p.label}: ${p.reason}`);
  return {
    model: detail.model.requestedModel,
    baseUrlHost: detail.provider.baseUrlHost,
    provider: detail.provider.kind,
    verdict: detail.test.verdict,
    reasons,
    versionUnverifiable: detail.test.versionUnverifiable,
    detectedModel: detail.test.detectedModel,
    probesPassed: detail.test.probesPassed,
    probesTotal: detail.test.probesTotal,
    totalTokens: detail.test.totalTokens,
    latencyMs: detail.test.latencyMs,
    transport: detail.test.transport,
    resolvedFormat: detail.provider.kind,
    formatFellBack: false,
    connectivityError: null,
    probes: detail.probes.map((p) => ({
      label: p.label,
      pass: p.pass,
      signal: p.signal,
      reason: p.reason,
      prompt: p.prompt,
      responseText: p.responseText,
      httpStatus: p.httpStatus,
      promptTokens: p.promptTokens,
      completionTokens: p.completionTokens,
      latencyMs: p.latencyMs,
    })),
  };
}
