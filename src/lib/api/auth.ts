import { Context } from "elysia";
import type { CookieOptions } from "elysia/cookies";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_FALLBACK_MAX_AGE,
  COOKIE_MAX_AGE,
  EDGE_SESSION_COOKIE,
  USER_ID_COOKIE,
} from "../config/constants";
import { serverEnv } from "@/server/env";
import { edgeSessionValue, signUserId } from "../utils/session-cookie";
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
  setEdgeSessionCookie(cookie, userId);
}

export function setEdgeSessionCookie(
  cookie: Context["cookie"],
  userId: string | number,
): void {
  if (!serverEnv.edgeSessionSecret) return;
  cookie[EDGE_SESSION_COOKIE].set({
    path: "/",
    sameSite: "lax",
    value: edgeSessionValue(userId),
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
  });
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
