import { msg } from "@/lib/config/constants";
import { serverEnv } from "@/server/env";
import { sealData, unsealData } from "iron-session";
import { createHmac } from "node:crypto";

export async function signUserId(userId: number | string): Promise<string> {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0)
    throw new Error(msg("ERRORS.INVALID_USER_ID"));
  return sealData({ uid: id }, { password: serverEnv.sessionSecret });
}

export async function verifyUserId(
  sealed: string | undefined,
): Promise<number | null> {
  if (!sealed) return null;
  const secrets = [serverEnv.sessionSecret, serverEnv.sessionSecretPrevious];
  for (const password of secrets) {
    if (password.length < 32) continue;
    try {
      const data = await unsealData<{ uid?: number }>(sealed, { password });
      const n = Number(data?.uid);
      return Number.isFinite(n) && n > 0 ? n : null;
    } catch {}
  }
  return null;
}

// Cloudflare's is_timed_hmac_valid_v0 layout: message, one separator byte, a
// 10-digit issue timestamp, "-", base64url MAC over message + timestamp.
export function edgeSessionValue(userId: string | number): string {
  const message = String(userId);
  const issued = String(Math.floor(Date.now() / 1000));
  const mac = createHmac("sha256", serverEnv.edgeSessionSecret)
    .update(message + issued)
    .digest("base64url");
  return `${message}.${issued}-${mac}`;
}
