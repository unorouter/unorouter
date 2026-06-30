import {
  CJK_CHAR,
  CJK_LEAK_MIN_CHARS,
  CLOUD_HOST_PATTERNS,
  CODING_TOOL_NAMES,
  CODING_TOOL_REFUSAL_PATTERNS,
  SCAM_PAGE_PATTERNS,
} from "./patterns";
import type { ProbeLabel, ProbeSignal } from "./types";

export const includesAny = (text: string, patterns: string[]) =>
  patterns.some((p) => text.includes(p));

export const hasCodingToolRefusal = (text: string) =>
  includesAny(text, CODING_TOOL_NAMES) ||
  includesAny(text, CODING_TOOL_REFUSAL_PATTERNS);

export const hasScamPage = (text: string) =>
  includesAny(text, SCAM_PAGE_PATTERNS);

// English prompt -> English answer expected. CJK leakage exposes a substituted
// Chinese model or a corrupting proxy that the identity Q&A probes miss.
export function cjkLeak(text: string): boolean {
  const m = text.match(CJK_CHAR);
  return m !== null && m.length >= CJK_LEAK_MIN_CHARS;
}

// Foreign identity is config-driven so the same helper serves all providers: the
// home provider passes the OTHER vendors as the foreign set.
export function hasForeignIdentity(
  text: string,
  foreignPatterns: string[],
  cloudModelNamePatterns: string[],
  probe: ProbeLabel,
): boolean {
  if (includesAny(text, foreignPatterns)) return true;
  if (probe === "model-name" && includesAny(text, cloudModelNamePatterns))
    return true;
  return false;
}

// Returns the single tier named in the text, or null when zero or more-than-one
// are present (avoids "opus or sonnet" hedges).
export function tierOf(text: string, tiers: readonly string[]): string | null {
  const found = tiers.filter((tier) => text.includes(tier));
  return found.length === 1 ? found[0]! : null;
}

export function detectTierMismatch(
  requestedModel: string,
  modelNameText: string | undefined,
  tiers: readonly string[],
): string | null {
  const reqTier = tierOf(requestedModel.toLowerCase(), tiers);
  if (!reqTier) return null;
  if (!modelNameText) return null;
  const saidTier = tierOf(modelNameText, tiers);
  if (saidTier && saidTier !== reqTier) return saidTier;
  return null;
}

export function detectSignal(
  text: string,
  probeLabel: ProbeLabel,
  foreignPatterns: string[],
  cloudModelNamePatterns: string[],
  acceptsCloudHostIdentity: boolean,
): ProbeSignal {
  if (text.length === 0) return "blank";
  if (hasCodingToolRefusal(text)) return "coding-tool";
  if (hasScamPage(text)) return "scam";
  if (cjkLeak(text)) return "cjk-leak";
  if (probeLabel === "identity" || probeLabel === "model-name") {
    if (
      hasForeignIdentity(
        text,
        foreignPatterns,
        cloudModelNamePatterns,
        probeLabel,
      )
    )
      return "foreign";
    if (
      probeLabel === "identity" &&
      acceptsCloudHostIdentity &&
      includesAny(text, CLOUD_HOST_PATTERNS)
    )
      return "cloud-host";
  }
  return null;
}

const TRANSIENT_HTTP = [408, 425, 429, 500, 502, 503, 504, 520, 522, 524];

export function isTransientError(msg: string): boolean {
  const m = msg.match(/HTTP (\d{3})/);
  if (m && TRANSIENT_HTTP.includes(Number(m[1]))) return true;
  const lower = msg.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("econnreset") ||
    lower.includes("socket") ||
    lower.includes("network") ||
    lower.includes("fetch failed")
  );
}
