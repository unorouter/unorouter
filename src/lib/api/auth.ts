import { stringifySetCookie } from "cookie";
import { Context } from "elysia";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_FALLBACK_MAX_AGE,
  COOKIE_MAX_AGE,
  LOCAL_USER_ID_COOKIE,
  USER_ID_COOKIE,
} from "../config/constants";
import { signUserId } from "../utils/server";

type AuthResponseData = {
  success?: boolean;
  message?: string;
  // 2FA-required and register responses carry no token or user, so every field
  // is optional. access_expires_at is unix seconds.
  data?: {
    access_token?: string;
    access_expires_at?: number;
    user?: { id?: string | number };
    require_2fa?: boolean;
    flow_token?: string;
  };
};

export type SessionCookieDescriptor = {
  name: string;
  value: string;
  path: "/";
  maxAge: number;
  sameSite: "lax";
  httpOnly?: boolean;
};

// Caps the cookie to the token's real lifetime so it cannot outlive the token
// and bounce the user to /login. Floors to 60s: an already-near-expiry token
// still yields a usable cookie rather than a negative maxAge.
export function accessTokenMaxAge(accessExpiresAt?: number): number {
  if (!accessExpiresAt) return ACCESS_TOKEN_FALLBACK_MAX_AGE;
  const remaining = accessExpiresAt - Math.floor(Date.now() / 1000);
  return remaining > 0 ? remaining : 60;
}

// The ONE definition of "establish session cookies", shared by every
// authenticated flow (OAuth, password, 2FA). The identity cookies keep the full
// 30-day TTL because they only select identity + the OPFS file; only the
// access_token is capped to the token's own lifetime.
export async function sessionCookieDescriptors(
  userId: string | number,
  opts?: { accessToken?: string; accessMaxAge?: number },
): Promise<SessionCookieDescriptor[]> {
  const base = {
    path: "/" as const,
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax" as const,
  };
  const descriptors: SessionCookieDescriptor[] = [
    { name: USER_ID_COOKIE, value: await signUserId(userId), ...base },
    { name: LOCAL_USER_ID_COOKIE, value: String(userId), ...base },
  ];
  if (opts?.accessToken) {
    descriptors.push({
      name: ACCESS_TOKEN_COOKIE,
      value: opts.accessToken,
      ...base,
      maxAge: opts.accessMaxAge ?? ACCESS_TOKEN_FALLBACK_MAX_AGE,
      httpOnly: true,
    });
  }
  return descriptors;
}

export async function handleAuthResponse(
  // Read structurally, not through Orval's LoginData: upstream returns a raw gin
  // body whose real shape (access_token/user/require_2fa) is wider than the
  // stale generated type.
  res: { data: unknown },
  set: Context["set"],
) {
  const body = res.data as AuthResponseData | undefined;
  const cookies: string[] = [];
  const data = body?.data;
  const accessToken = data?.access_token;
  const id = data?.user?.id;
  // No token means 2FA-required or register: set nothing and let the client
  // drive the next step.
  if (accessToken && id) {
    for (const descriptor of await sessionCookieDescriptors(id, {
      accessToken,
      accessMaxAge: accessTokenMaxAge(data?.access_expires_at),
    })) {
      cookies.push(stringifySetCookie(descriptor));
    }
  }
  if (cookies.length) set.headers["set-cookie"] = cookies;
  return body;
}
