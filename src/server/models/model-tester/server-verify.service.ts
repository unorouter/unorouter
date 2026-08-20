import { errMessage, safeJsonParse } from "@/lib/utils/base";
import { safeFetchRaw } from "@/lib/config/safe-fetch";
import type { TransportArgs, TransportResult } from "@/lib/ai/verify/transport";

const PROBE_MAX_BYTES = 256 * 1024;

// The probe URL is user-supplied, so this stays server-only and rides
// safeFetchRaw; the browser's own transport in tester-form cannot be reused.
export async function serverTransport(
  args: TransportArgs,
): Promise<TransportResult> {
  try {
    const res = await safeFetchRaw(args.url, {
      method: "POST",
      headers: { ...args.headers, "content-type": "application/json" },
      body: JSON.stringify(args.reqBody),
      maxBytes: PROBE_MAX_BYTES,
    });
    return {
      status: res.status,
      data: safeJsonParse<unknown>(res.buffer.toString("utf8"), null),
      error: null,
      corsBlocked: false,
    };
  } catch (err) {
    return {
      status: null,
      data: null,
      error: errMessage(err),
      corsBlocked: false,
    };
  }
}
