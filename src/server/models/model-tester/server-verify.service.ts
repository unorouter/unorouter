import { safeFetchRaw } from "@/lib/config/r2";
import { runVerification } from "@/lib/ai/verify/runner";
import type { TransportArgs, TransportResult } from "@/lib/ai/verify/transport";
import type { VerifyProvider } from "@/lib/ai/verify/types";

const PROBE_MAX_BYTES = 256 * 1024;

// Server-side transport: SSRF-guarded forward to the user-given endpoint. This is
// what makes a published result UNFORGEABLE - the server itself issues the probe
// requests and reads the real upstream responses; the client never produces the
// stored verdict.
async function serverTransport(args: TransportArgs): Promise<TransportResult> {
  try {
    const res = await safeFetchRaw(args.url, {
      method: "POST",
      headers: { ...args.headers, "content-type": "application/json" },
      body: JSON.stringify(args.reqBody),
      maxBytes: PROBE_MAX_BYTES,
    });
    let data: unknown = null;
    try {
      data = JSON.parse(res.buffer.toString("utf8"));
    } catch {
      data = null;
    }
    return { status: res.status, data, error: null, corsBlocked: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: null, data: null, error: message, corsBlocked: false };
  }
}

// Run the FULL verification server-side (handshake + probes) with the user's key.
export function runServerVerification(opts: {
  provider: VerifyProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
}) {
  return runVerification({
    provider: opts.provider,
    baseUrl: opts.baseUrl,
    apiKey: opts.apiKey,
    model: opts.model,
    // mode is irrelevant when transport is injected (no CORS server-side);
    // "direct" keeps the anthropic browser-CORS header off.
    mode: "direct",
    transport: serverTransport,
  });
}
