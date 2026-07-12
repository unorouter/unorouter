import { parseSetCookie, stringifySetCookie } from "cookie";
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
  data?: { id?: string | number };
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
// plain local-user-id twin, plus the httpOnly access_token when the flow has
// one (OAuth). Email/password login has no token and rides the upstream gin
// session instead.
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
  res: { data: AuthResponseData | undefined; headers: Headers },
  set: Context["set"],
) {
  const cookies = (res.headers?.getSetCookie?.() ?? []).map((str) => {
    const cookie = parseSetCookie(str);
    delete cookie.domain;
    cookie.secure = false;
    cookie.sameSite = "lax";
    return stringifySetCookie(cookie, { encode: String });
  });
  const id = res.data?.data?.id;
  if (id) {
    for (const descriptor of await sessionCookieDescriptors(id)) {
      cookies.push(stringifySetCookie(descriptor));
    }
    // Password login authenticates via the fresh session cookie; a leftover
    // OAuth access token would take precedence in deriveUpstream and pin the
    // old identity, so expire it here.
    cookies.push(
      stringifySetCookie({
        name: ACCESS_TOKEN_COOKIE,
        value: "",
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      }),
    );
  }
  if (cookies.length) set.headers["set-cookie"] = cookies;
  return res.data;
}
