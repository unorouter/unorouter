import { errMessage } from "@/lib/utils/base";
import { safeFetchRaw } from "@/lib/config/r2";
import type { VerifyProbeBody } from "@/lib/api/typebox/verify";

const PROBE_MAX_BYTES = 256 * 1024;

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
    const message = errMessage(err);
    return { status: 0, data: { error: { message } } };
  }
}
