import { parseSetCookie, stringifySetCookie } from "cookie";
import { Context } from "elysia";
import {
  ACCESS_TOKEN_COOKIE,
  ACCESS_TOKEN_FALLBACK_MAX_AGE,
  COOKIE_MAX_AGE,
  LOCAL_USER_ID_COOKIE,
  REFRESH_TOKEN_COOKIE,
  USER_ID_COOKIE,
} from "../config/constants";
import { signUserId } from "../utils/server";

type AuthResponseData = {
  success?: boolean;
  message?: string;
  data?: {
    // Stateless-token login (password / 2FA success): upstream returns the
    // dashboard access token + the user record. 2FA-required and register
    // responses carry neither, so both are optional. access_expires_at (unix
    // seconds) bounds the token TTL; absent on non-token responses.
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

// Given upstream's access_expires_at (unix seconds), the maxAge to cap the BFF
// access_token cookie with. Floors to a small positive value so an
// already-near-expiry token still yields a usable (short) cookie; falls back to
// ACCESS_TOKEN_FALLBACK_MAX_AGE when the response omits the field.
export function accessTokenMaxAge(accessExpiresAt?: number): number {
  if (!accessExpiresAt) return ACCESS_TOKEN_FALLBACK_MAX_AGE;
  const remaining = accessExpiresAt - Math.floor(Date.now() / 1000);
  return remaining > 0 ? remaining : 60;
}

// Upstream sets the refresh cookie for its own domain (api.unorouter.com). The
// browser talks to the BFF origin, so we strip the domain and re-issue it as a
// first-party httpOnly cookie (path=/, 30d, sameSite=lax) exactly like the OLD
// code re-domained the gin session. Returns the descriptor, or null when the
// header is absent.
export function refreshCookieDescriptor(
  headers: Headers,
): SessionCookieDescriptor | null {
  for (const raw of headers.getSetCookie()) {
    const parsed = parseSetCookie(raw);
    if (parsed.name !== REFRESH_TOKEN_COOKIE || parsed.value == null) continue;
    return {
      name: REFRESH_TOKEN_COOKIE,
      value: parsed.value,
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
    };
  }
  return null;
}

export function reissueRefreshCookie(headers: Headers): string | null {
  const descriptor = refreshCookieDescriptor(headers);
  return descriptor ? stringifySetCookie(descriptor) : null;
}

// The ONE definition of "establish session cookies": sealed user-id + its
// plain local-user-id twin, plus the httpOnly access_token. Upstream moved to
// stateless tokens (no gin session), so EVERY authenticated flow - OAuth,
// password, and 2FA - returns an access token the BFF stores here. The access
// token cookie is TTL-capped to the token's real lifetime (accessMaxAge); the
// identity cookies keep the 30-day TTL (they only select identity + the OPFS
// file and are re-set on every refresh).
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
  // The upstream login/register handlers return a raw gin body whose real shape
  // (access_token/user/require_2fa) is wider than the stale generated LoginData,
  // so we read it structurally rather than through the Orval type.
  res: { data: unknown; headers: Headers },
  set: Context["set"],
) {
  const body = res.data as AuthResponseData | undefined;
  const cookies: string[] = [];
  const data = body?.data;
  const accessToken = data?.access_token;
  const id = data?.user?.id;
  // A successful password / 2FA login carries the stateless access token +
  // user record. Persist them exactly like the OAuth callback does, forward
  // upstream's refresh cookie re-domained to us, and cap the token cookie to
  // its real lifetime. A 2FA-required response (require_2fa/flow_token) and the
  // register response carry no token, so we set no cookies and let the client
  // drive the next step.
  if (accessToken && id) {
    for (const descriptor of await sessionCookieDescriptors(id, {
      accessToken,
      accessMaxAge: accessTokenMaxAge(data?.access_expires_at),
    })) {
      cookies.push(stringifySetCookie(descriptor));
    }
    const refreshCookie = reissueRefreshCookie(res.headers);
    if (refreshCookie) cookies.push(refreshCookie);
  }
  if (cookies.length) set.headers["set-cookie"] = cookies;
  return body;
}
