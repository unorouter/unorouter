import { verifyProbeBody } from "@/lib/api/typebox/verify";
import { safeFetchRaw } from "@/lib/config/safe-fetch";
import { errMessage, safeJsonParse } from "@/lib/utils/base";
import { rateLimit } from "@/server/rate-limit";
import { Elysia } from "elysia";

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

// Server-side retry for provider endpoints that serve no CORS headers, which a
// browser cannot call at all. Failures are reported as status 0 rather than
// thrown: the tester renders them as a probe result.
export const verifyRoute = new Elysia({ prefix: "/verify" }).post(
  "/probe",
  async ({ body }) => {
    const data = await safeFetchRaw(body.url, {
      method: "POST",
      headers: {
        ...probeHeaders(body.headers),
        "content-type": "application/json",
      },
      body: JSON.stringify(body.reqBody),
      maxBytes: PROBE_MAX_BYTES,
    })
      .then((res) => ({
        status: res.status,
        data: safeJsonParse<unknown>(res.buffer.toString("utf8"), null),
      }))
      .catch((err) => ({
        status: 0,
        data: { error: { message: errMessage(err) } },
      }));
    return { success: true, data };
  },
  { body: verifyProbeBody, beforeHandle: rateLimit(30) },
);
