import { parseSetCookie, serialize } from "cookie";
import { Context } from "elysia";
import { SESSION_COOKIE, USER_ID_COOKIE } from "../config/constants";

export const AUTH_COOKIES = [SESSION_COOKIE, USER_ID_COOKIE] as const;

export function rewriteCookies(headers: Headers): string[] {
  return (headers?.getSetCookie?.() ?? []).map((str) => {
    const cookie = parseSetCookie(str);
    delete cookie.domain;
    cookie.secure = false;
    cookie.sameSite = "lax";
    return serialize(cookie, { encode: String });
  });
}

export function handleAuthResponse(
  res: { data: any; headers: Headers },
  set: Context["set"],
) {
  const cookies = rewriteCookies(res.headers);
  const id = res.data?.data?.id;
  if (id) {
    cookies.push(
      serialize(USER_ID_COOKIE, String(id), {
        path: "/",
        maxAge: 2592000,
        sameSite: "lax",
      }),
    );
  }
  if (cookies.length) set.headers["set-cookie"] = cookies;
  return res.data;
}
