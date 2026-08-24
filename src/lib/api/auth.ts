import { Context } from "elysia";
import type { CookieOptions } from "elysia/cookies";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_FALLBACK_MAX_AGE,
  COOKIE_MAX_AGE,
  USER_ID_COOKIE,
} from "../config/constants";
import { signUserId } from "../utils/server";
import { authResponseChecker, type AuthResponseData } from "../validation/auth";

function parseAuthResponse(raw: unknown): AuthResponseData | undefined {
  return authResponseChecker.Check(raw) ? raw : undefined;
}

// The identity cookie outlives the token deliberately: it only selects identity
// + the OPFS file. access_token is capped to the token's own lifetime, floored
// at 60s so a near-expiry token still yields a usable cookie, never a negative
// maxAge.
// accessToken is REQUIRED: an identity cookie without one is the half-logged-in
// state the middleware retracts on sight.
export async function setSessionCookies(
  cookie: Context["cookie"],
  userId: string | number,
  accessToken: string,
  accessExpiresAt?: number,
): Promise<void> {
  const base: CookieOptions = { path: "/", sameSite: "lax" };
  // httpOnly: only the server unseals this. The client learns it is logged in
  // from the auth query cache, which the prefetch always seeds.
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
}

// Writes an expiry rather than `.remove()`, which emits nothing for a cookie the
// request did not send: that is the only way to retire a stale "local-user-id".
export function clearSessionCookies(cookie: Context["cookie"]): void {
  for (const name of [ACCESS_TOKEN_COOKIE, USER_ID_COOKIE, "local-user-id"]) {
    cookie[name].set({ value: "", path: "/", maxAge: 0, sameSite: "lax" });
  }
}

// `unknown` not Orval's LoginData: upstream returns a raw gin body wider than
// the generated type.
export async function handleAuthResponse(
  res: { data: unknown },
  cookie: Context["cookie"],
) {
  const body = parseAuthResponse(res.data);
  const data = body?.data;
  const id = data?.user?.id;
  // No token means 2FA-required or register: the client drives the next step.
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
