import { stringifySetCookie } from "cookie";
import { Context } from "elysia";
import {
  ACCESS_TOKEN_COOKIE,
  COOKIE_MAX_AGE,
  LOCAL_USER_ID_COOKIE,
  USER_ID_COOKIE,
} from "../config/constants";
import { signUserId } from "../utils/server";

type AuthResponseData = {
  success?: boolean;
  message?: string;
  data?: {
    // Stateless-token login (password / 2FA success): upstream returns the
    // dashboard access token + the user record. 2FA-required and register
    // responses carry neither, so both are optional.
    access_token?: string;
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

// The ONE definition of "establish session cookies": sealed user-id + its
// plain local-user-id twin, plus the httpOnly access_token. Upstream moved to
// stateless tokens (no gin session), so EVERY authenticated flow - OAuth,
// password, and 2FA - returns an access token the BFF stores here.
export async function sessionCookieDescriptors(
  userId: string | number,
  opts?: { accessToken?: string },
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
  // user record. Persist them exactly like the OAuth callback does. A
  // 2FA-required response (require_2fa/flow_token) and the register response
  // carry no token, so we set no cookies and let the client drive the next step.
  if (accessToken && id) {
    for (const descriptor of await sessionCookieDescriptors(id, {
      accessToken,
    })) {
      cookies.push(stringifySetCookie(descriptor));
    }
  }
  if (cookies.length) set.headers["set-cookie"] = cookies;
  return body;
}
