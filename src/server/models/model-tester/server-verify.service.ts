import { errMessage } from "@/lib/utils/base";
import { safeFetchRaw } from "@/lib/config/safe-fetch";
import { runVerification } from "@/lib/ai/verify/runner";
import type { TransportArgs, TransportResult } from "@/lib/ai/verify/transport";
import type { VerifyProvider } from "@/lib/ai/verify/types";

const PROBE_MAX_BYTES = 256 * 1024;

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
    const message = errMessage(err);
    return { status: null, data: null, error: message, corsBlocked: false };
  }
}

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
    mode: "direct",
    transport: serverTransport,
  });
}
