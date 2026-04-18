import { serverEnv } from "@/server/env";
import { createHmac, timingSafeEqual } from "node:crypto";

function hmac(payload: string): string {
  if (!serverEnv.sessionSecret) throw new Error("SESSION_SECRET is not set");
  return createHmac("sha256", serverEnv.sessionSecret)
    .update(payload)
    .digest("base64url");
}

export function signUserId(
  userId: number | string,
  accessToken: string,
): string {
  const id = String(userId);
  return `${id}.${hmac(`${id}:${accessToken}`)}`;
}

export function verifyUserId(
  signed: string | undefined,
  accessToken: string | undefined,
): number | null {
  if (!signed || !accessToken) return null;
  const dot = signed.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = signed.slice(0, dot);
  const sig = signed.slice(dot + 1);
  let expected: string;
  try {
    expected = hmac(`${id}:${accessToken}`);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const n = Number(id);
  return Number.isFinite(n) && n > 0 ? n : null;
}
