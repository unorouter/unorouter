import { errMessage, safeJsonParse } from "@/lib/utils/base";
import { safeFetchRaw } from "@/lib/config/safe-fetch";
import type {
  TransportArgs,
  TransportResult,
} from "ai-model-verifier/transport";

const PROBE_MAX_BYTES = 256 * 1024;

const DROPPED_HEADERS = new Set([
  "cookie",
  "host",
  "connection",
  "keep-alive",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-real-ip",
]);
const DROPPED_PREFIXES = ["proxy-", "cf-", "x-forwarded-"];

// The tester only needs auth and provider headers; anything that names a
// client address or steers the connection must not be caller controlled.
function probeHeaders(headers: Record<string, string>) {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (DROPPED_HEADERS.has(lower)) continue;
    if (DROPPED_PREFIXES.some((p) => lower.startsWith(p))) continue;
    out[name] = value;
  }
  return out;
}

// The probe URL is user-supplied, so this stays server-only and rides
// safeFetchRaw; the browser's own transport in tester-form cannot be reused.
export async function serverTransport(
  args: Pick<TransportArgs, "url" | "headers" | "reqBody">,
): Promise<TransportResult> {
  try {
    const res = await safeFetchRaw(args.url, {
      method: "POST",
      headers: {
        ...probeHeaders(args.headers),
        "content-type": "application/json",
      },
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
