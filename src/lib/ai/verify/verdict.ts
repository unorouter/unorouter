import { detectTierMismatch } from "./signals";
import type { ProviderConfig } from "./providers/config";
import type {
  ProbeLabel,
  ProbeOutcome,
  ProbeSignal,
  VerifyVerdict,
} from "./types";

// Per-probe data the verdict needs beyond the persisted ProbeOutcome (the model
// name text is required for tier-mismatch but never persisted).
export type ProbeEval = ProbeOutcome & {
  signalForVerdict: ProbeSignal;
  text: string | undefined;
};

export type VerdictResult = {
  verdict: VerifyVerdict;
  reasons: string[];
  versionUnverifiable: boolean;
};

const labelsWith = (results: ProbeEval[], sig: ProbeSignal) =>
  results
    .filter((r) => r.signalForVerdict === sig)
    .map((r) => r.label)
    .join(", ");

// First matching hard-fail signal, or null. Keeps the short-circuit order in one place.
const firstSignal = (results: ProbeEval[], sig: ProbeSignal) =>
  results.some((r) => r.signalForVerdict === sig)
    ? labelsWith(results, sig)
    : null;

export function aggregateVerdict(args: {
  model: string;
  cfg: ProviderConfig;
  results: ProbeEval[];
}): VerdictResult {
  const results = args.results;
  const reasons: string[] = [];

  // Hard-fail short-circuit ORDER (matches new-api-sync exactly).
  const codingTool = firstSignal(results, "coding-tool");
  if (codingTool) return suspicious(`coding-tool-refusal: ${codingTool}`);
  const scam = firstSignal(results, "scam");
  if (scam) return suspicious(`scam-page: ${scam}`);
  const cjk = firstSignal(results, "cjk-leak");
  if (cjk) return suspicious(`cjk-language-leak: ${cjk}`);

  const muxLabels = results.filter((r) => r.muxFailure).map((r) => r.label);
  if (muxLabels.length >= 2)
    return suspicious(
      `unsafe-proxy: response-mixing on ${muxLabels.join(", ")}`,
    );

  const foreignOnIdentity = results.some(
    (r) =>
      r.signalForVerdict === "foreign" &&
      (r.label === "model-name" || r.label === "identity"),
  );
  if (foreignOnIdentity)
    return suspicious(`foreign-identity: ${labelsWith(results, "foreign")}`);

  // Tier substitution (anthropic-only).
  if (args.cfg.tiers) {
    const modelNameText = results.find(
      (r) => r.label === ("model-name" satisfies ProbeLabel),
    )?.text;
    const served = detectTierMismatch(
      args.model,
      modelNameText,
      args.cfg.tiers,
    );
    if (served)
      return suspicious(
        `tier-mismatch: requested ${args.model}, served ${served}`,
      );
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass);
  const passing = passed >= 3;

  if (passing)
    return {
      verdict: "genuine",
      reasons,
      // A genuine result confirms vendor + tier; the exact version is never
      // behaviorally verifiable, so flag it as advisory.
      versionUnverifiable: true,
    };

  // Not passing: if the shortfall is purely transient (429/5xx/timeout) with no
  // real signal, do not condemn - it is just unverified this run.
  const transientFails = failed.filter((r) => r.transient).length;
  const nonTransientFails = failed.filter(
    (r) => !r.transient && r.signalForVerdict !== null,
  ).length;
  if (transientFails > 0 && nonTransientFails === 0)
    return {
      verdict: "unverified",
      reasons: [`transient: ${failed.map((r) => r.label).join(", ")}`],
      versionUnverifiable: false,
    };

  return suspicious(`failed: ${failed.map((r) => r.label).join(", ")}`);
}

function suspicious(reason: string): VerdictResult {
  return {
    verdict: "suspicious",
    reasons: [reason],
    versionUnverifiable: false,
  };
}

// Short per-probe explanation for the transparency UI.
export function probeReason(
  pass: boolean,
  signal: ProbeSignal,
  muxFailure: boolean,
  transient: boolean,
): string {
  if (signal === "coding-tool") return "coding-tool wrapper detected";
  if (signal === "scam") return "scam page detected";
  if (signal === "cjk-leak") return "CJK leaked into an English reply";
  if (signal === "foreign") return "foreign vendor named";
  if (signal === "cloud-host") return "cloud host named (accepted)";
  if (signal === "blank") return "blank response";
  if (muxFailure) return "response mixing (nonce mismatch)";
  if (transient) return "transient upstream error";
  return pass ? "passed" : "failed quality check";
}
