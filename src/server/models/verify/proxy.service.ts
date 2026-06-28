import { safeFetchRaw } from "@/lib/config/r2";
import type { VerifyProbeBody } from "@/lib/api/typebox/verify";

const PROBE_MAX_BYTES = 256 * 1024;

// Stateless forward: send the client-built probe request to the user-given URL
// with the user-given headers/key, return ONLY the upstream JSON + status. No
// token injection, no logging, no storage. SSRF protection comes from
// safeFetchRaw (CIDR/DNS allowlist, redirect:manual, port/proto allowlist).
export async function forwardProbe(
  body: VerifyProbeBody,
): Promise<{ status: number; data: unknown }> {
  try {
    const res = await safeFetchRaw(body.url, {
      method: "POST",
      headers: { ...body.headers, "content-type": "application/json" },
      body: JSON.stringify(body.reqBody),
      maxBytes: PROBE_MAX_BYTES,
    });
    let data: unknown = null;
    try {
      data = JSON.parse(res.buffer.toString("utf8"));
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { status: 0, data: { error: { message } } };
  }
}
