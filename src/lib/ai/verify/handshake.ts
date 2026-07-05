import { PROVIDER_CONFIGS } from "./providers/config";
import { probeTransport, type TransportFn } from "./transport";
import { isTransientError } from "./signals";
import type { TransportMode, VerifyProvider } from "./types";

// The first request is METADATA gathering, not a scored probe. It resolves:
// - which API format actually works (native first, then OpenAI as the universal
//   standard, since gateways usually expose chat/completions),
// - whether direct browser fetch works or the backend proxy is needed (CORS),
// - whether the endpoint is reachable and the key is valid.
// The real behavioral probes then run on the resolved format + transport.

export type HandshakeOutcome =
  | {
      ok: true;
      resolvedProvider: VerifyProvider;
      mode: TransportMode;
      status: number;
    }
  | {
      ok: false;
      reason:
        "cors-needs-backend" | "unreachable" | "invalid-key" | "no-format";
      status: number | null;
      corsBlocked: boolean;
    };

const HANDSHAKE_PROMPT = "hi";
const HANDSHAKE_MAX_TOKENS = 1;

// 401/403 = the endpoint works but the key is bad. Any other 4xx on a format =
// that format is not supported here, so we try the fallback.
function classifyStatus(
  status: number,
): "ok" | "auth" | "format" | "transient" {
  if (status >= 200 && status < 300) return "ok";
  if (status === 401 || status === 403) return "auth";
  if (isTransientError(`HTTP ${status}`)) return "transient";
  if (status >= 400 && status < 500) return "format";
  return "transient";
}

async function tryFormat(args: {
  provider: VerifyProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  mode: TransportMode;
  timeoutMs: number;
  transport: TransportFn;
}): Promise<{
  outcome: "ok" | "auth" | "format" | "transient" | "cors";
  status: number | null;
  corsBlocked: boolean;
}> {
  const cfg = PROVIDER_CONFIGS[args.provider];
  const built = cfg.buildRequest({
    baseUrl: args.baseUrl,
    apiKey: args.apiKey,
    model: args.model,
    prompt: HANDSHAKE_PROMPT,
    maxTokens: HANDSHAKE_MAX_TOKENS,
    direct: args.mode === "direct",
  });
  const res = await args.transport({
    mode: args.mode,
    provider: args.provider,
    url: built.url,
    headers: built.headers,
    reqBody: built.body,
    timeoutMs: args.timeoutMs,
  });

  if (res.corsBlocked)
    return { outcome: "cors", status: null, corsBlocked: true };
  if (res.status === null)
    return { outcome: "transient", status: null, corsBlocked: false };
  return {
    outcome: classifyStatus(res.status),
    status: res.status,
    corsBlocked: false,
  };
}

export async function runHandshake(opts: {
  provider: VerifyProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  mode: TransportMode;
  timeoutMs: number;
  transport?: TransportFn;
}): Promise<HandshakeOutcome> {
  const transport = opts.transport ?? probeTransport;
  // Native format first, then OpenAI as the universal fallback (skip if native
  // already IS openai).
  const order: VerifyProvider[] =
    opts.provider === "openai" ? ["openai"] : [opts.provider, "openai"];

  let sawAuth = false;
  let lastStatus: number | null = null;

  for (const provider of order) {
    const r = await tryFormat({ ...opts, provider, transport });
    lastStatus = r.status;

    if (r.outcome === "cors")
      return {
        ok: false,
        reason: "cors-needs-backend",
        status: null,
        corsBlocked: true,
      };
    if (r.outcome === "ok")
      return {
        ok: true,
        resolvedProvider: provider,
        mode: opts.mode,
        status: r.status!,
      };
    if (r.outcome === "auth") sawAuth = true;
    // "format" or "transient" -> try the next format in the order.
  }

  // No format returned 2xx. An auth seen anywhere means the endpoint is up but
  // the key is bad; otherwise nothing usable answered.
  if (sawAuth)
    return {
      ok: false,
      reason: "invalid-key",
      status: lastStatus,
      corsBlocked: false,
    };
  if (lastStatus === null)
    return {
      ok: false,
      reason: "unreachable",
      status: null,
      corsBlocked: false,
    };
  return {
    ok: false,
    reason: "no-format",
    status: lastStatus,
    corsBlocked: false,
  };
}
