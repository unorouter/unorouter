import { verifyProbeBody } from "@/lib/api/typebox/verify";
import { rateLimit } from "@/server/rate-limit";
import { Elysia } from "elysia";
import { serverTransport } from "@/server/models/model-tester/server-verify.service";

// Server-side retry for provider endpoints that serve no CORS headers, which a
// browser cannot call at all. Failures are reported as status 0 rather than
// thrown: the tester renders them as a probe result.
export const verifyRoute = new Elysia({ prefix: "/verify" }).post(
  "/probe",
  async ({ body }) => {
    const res = await serverTransport(body);
    return {
      success: true,
      data: res.error
        ? { status: 0, data: { error: { message: res.error } } }
        : { status: res.status ?? 0, data: res.data },
    };
  },
  { body: verifyProbeBody, beforeHandle: rateLimit("verify", 30) },
);
