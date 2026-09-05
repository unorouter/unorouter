import { Context } from "elysia";
import type { CookieOptions } from "elysia/cookies";
import { createHmac } from "node:crypto";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_FALLBACK_MAX_AGE,
  COOKIE_MAX_AGE,
  EDGE_SESSION_COOKIE,
  USER_ID_COOKIE,
} from "../config/constants";
import { serverEnv } from "@/server/env";
import { signUserId } from "../utils/server";

// Cloudflare's is_timed_hmac_valid_v0 layout: message, one separator byte, a
// 10-digit issue timestamp, "-", base64url MAC over message + timestamp.
function edgeSessionValue(userId: string | number): string {
  const message = String(userId);
  const issued = String(Math.floor(Date.now() / 1000));
  const mac = createHmac("sha256", serverEnv.edgeSessionSecret)
    .update(message + issued)
    .digest("base64url");
  return `${message}.${issued}-${mac}`;
}
import { authResponseChecker, type AuthResponseData } from "../validation/auth";

function parseAuthResponse(raw: unknown): AuthResponseData | undefined {
  return authResponseChecker.Check(raw) ? raw : undefined;
}

export async function setSessionCookies(
  cookie: Context["cookie"],
  userId: string | number,
  accessToken: string,
  accessExpiresAt?: number,
): Promise<void> {
  const base: CookieOptions = { path: "/", sameSite: "lax" };
  cookie[USER_ID_COOKIE].set({
    ...base,
    value: await signUserId(userId),
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
  });
  const remaining = accessExpiresAt
    ? accessExpiresAt - Math.floor(Date.now() / 1000)
    : 0;
  cookie[ACCESS_TOKEN_COOKIE].set({
    ...base,
    value: accessToken,
    maxAge: accessExpiresAt
      ? Math.max(remaining, 60)
      : ACCESS_TOKEN_FALLBACK_MAX_AGE,
    httpOnly: true,
  });
  if (serverEnv.edgeSessionSecret) {
    cookie[EDGE_SESSION_COOKIE].set({
      ...base,
      value: edgeSessionValue(userId),
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
    });
  }
}

// Not `.remove()`: it emits nothing for a cookie the request did not send, leaving a stale "local-user-id" alive.
export function clearSessionCookies(cookie: Context["cookie"]): void {
  for (const name of [
    ACCESS_TOKEN_COOKIE,
    USER_ID_COOKIE,
    EDGE_SESSION_COOKIE,
    "local-user-id",
  ]) {
    cookie[name].set({ value: "", path: "/", maxAge: 0, sameSite: "lax" });
  }
}

export async function handleAuthResponse(
  res: { data: unknown },
  cookie: Context["cookie"],
) {
  const body = parseAuthResponse(res.data);
  const data = body?.data;
  const id = data?.user?.id;
  if (data?.access_token && id) {
    await setSessionCookies(
      cookie,
      id,
      data.access_token,
      data.access_expires_at,
    );
  }
  return body;
}
