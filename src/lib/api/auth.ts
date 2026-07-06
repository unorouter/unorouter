import { parseSetCookie, stringifySetCookie } from "cookie";
import { Context } from "elysia";
import {
  ACCESS_TOKEN_COOKIE,
  COOKIE_MAX_AGE,
  USER_ID_COOKIE,
} from "../config/constants";
import { signUserId } from "../utils/server";

type AuthResponseData = {
  success?: boolean;
  message?: string;
  data?: { id?: string | number };
};

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
    cookies.push(
      stringifySetCookie({
        name: USER_ID_COOKIE,
        value: await signUserId(id),
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
      }),
    );
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
