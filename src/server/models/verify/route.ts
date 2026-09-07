import { verifyProbeBody } from "@/lib/api/typebox/verify";
import { safeFetchRaw } from "@/lib/config/safe-fetch";
import { errMessage, safeJsonParse } from "@/lib/utils/base";
import { Elysia } from "elysia";

const PROBE_MAX_BYTES = 256 * 1024;

// Server-side retry for provider endpoints that serve no CORS headers, which a
// browser cannot call at all. Failures are reported as status 0 rather than
// thrown: the tester renders them as a probe result.
export const verifyRoute = new Elysia({ prefix: "/verify" }).post(
  "/probe",
  async ({ body }) => {
    const data = await safeFetchRaw(body.url, {
      method: "POST",
      headers: { ...body.headers, "content-type": "application/json" },
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
  { body: verifyProbeBody },
);
