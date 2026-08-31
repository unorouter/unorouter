import type { ResultCardData } from "./test-result-card";
import type { TestResultDetail } from "@/lib/api/typebox/model-tester";
import type { VerifyResult } from "@unorouter/verify-core/types";

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
      transient: p.transient,
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

export function toResultCardData(detail: TestResultDetail): ResultCardData {
  const reasons = detail.probes
    .filter((p) => !p.pass && p.reason)
    .map((p) => `${p.label}: ${p.reason}`);
  return {
    model: detail.model,
    baseUrlHost: detail.baseUrlHost,
    provider: detail.provider,
    verdict: detail.verdict,
    reasons,
    versionUnverifiable: detail.versionUnverifiable,
    detectedModel: detail.detectedModel,
    probesPassed: detail.probesPassed,
    probesTotal: detail.probesTotal,
    totalTokens: detail.totalTokens,
    latencyMs: detail.latencyMs,
    transport: detail.transport,
    resolvedFormat: detail.resolvedFormat,
    formatFellBack: detail.formatFellBack,
    connectivityError: null,
    probes: detail.probes.map((p) => ({
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
    })),
  };
}
