export type VerifyProvider = "anthropic" | "openai" | "gemini";

export type VerifyVerdict = "genuine" | "suspicious" | "unverified";

export type ProbeLabel = "emotional" | "creative" | "identity" | "model-name";

export type ProbeSignal =
  | "coding-tool"
  | "scam"
  | "foreign"
  | "cloud-host"
  | "cjk-leak"
  | "blank"
  | null;

export type TransportMode = "direct" | "server";

export type ProbeUsage = {
  prompt: number | null;
  completion: number | null;
  total: number | null;
};

// Full per-probe record. prompt + responseText are kept LOCALLY for transparency
// (the reply is the model's answer, not the key; the key only rides the request
// header and is never persisted). Never included in the published payload.
export type ProbeOutcome = {
  label: ProbeLabel;
  pass: boolean;
  signal: ProbeSignal;
  muxFailure: boolean;
  transient: boolean;
  latencyMs: number;
  prompt: string;
  responseText: string | null;
  httpStatus: number | null;
  usage: ProbeUsage | null;
  detectedModel: string | null;
  reason: string | null;
};

export type VerifyResult = {
  provider: VerifyProvider;
  model: string;
  baseUrlHost: string;
  verdict: VerifyVerdict;
  versionUnverifiable: boolean;
  probes: ProbeOutcome[];
  reasons: string[];
  probesPassed: number;
  probesTotal: number;
  latencyMs: number;
  transport: TransportMode;
  corsBlocked: boolean;
  detectedModel: string | null;
  totalUsage: ProbeUsage | null;
  // The format the handshake actually resolved to (may differ from the picked
  // one if the native format was not supported and we fell back to OpenAI).
  resolvedProvider: VerifyProvider;
  // Set when the handshake short-circuited before the behavioral probes ran.
  connectivityError:
    | "cors-needs-backend"
    | "unreachable"
    | "invalid-key"
    | "no-format"
    | null;
};
