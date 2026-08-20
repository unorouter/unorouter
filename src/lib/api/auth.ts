import { Context } from "elysia";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_FALLBACK_MAX_AGE,
  COOKIE_MAX_AGE,
  USER_ID_COOKIE,
} from "../config/constants";
import { signUserId } from "../utils/server";

// Every field optional: 2FA-required and register responses carry no token or
// user. access_expires_at is unix seconds.
type AuthResponseData = {
  success?: boolean;
  message?: string;
  data?: {
    access_token?: string;
    access_expires_at?: number;
    user?: { id?: string | number };
    require_2fa?: boolean;
    flow_token?: string;
  };
};

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
  const base = { path: "/" as const, sameSite: "lax" as const };
  cookie[USER_ID_COOKIE].set({
    ...base,
    value: await signUserId(userId),
    maxAge: COOKIE_MAX_AGE,
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
  const body = res.data as AuthResponseData | undefined;
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
