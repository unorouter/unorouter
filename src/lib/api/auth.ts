import { parseSetCookie, serialize } from "cookie";
import { Context } from "elysia";
import {
  ACCESS_TOKEN_COOKIE,
  COOKIE_MAX_AGE,
  USER_ID_COOKIE,
} from "../config/constants";
import { signUserId } from "../utils/signed-cookie";

type AuthResponseData = {
  success?: boolean;
  message?: string;
  data?: { id?: string | number };
};

export function handleAuthResponse(
  res: { data: AuthResponseData | undefined; headers: Headers },
  set: Context["set"],
) {
  const rawSetCookies = res.headers?.getSetCookie?.() ?? [];
  let accessToken: string | undefined;
  const cookies = rawSetCookies.map((str) => {
    const cookie = parseSetCookie(str);
    if (cookie.name === ACCESS_TOKEN_COOKIE) accessToken = cookie.value;
    delete cookie.domain;
    cookie.secure = false;
    cookie.sameSite = "lax";
    return serialize(cookie, { encode: String });
  });
  const id = res.data?.data?.id;
  if (id && accessToken) {
    cookies.push(
      serialize(USER_ID_COOKIE, signUserId(id, accessToken), {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
      }),
    );
  }
  if (cookies.length) set.headers["set-cookie"] = cookies;
  return res.data;
}
