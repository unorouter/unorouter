import { parseSetCookie, serialize } from "cookie";
import { Context } from "elysia";
import { COOKIE_MAX_AGE, USER_ID_COOKIE } from "../config/constants";
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
  const cookies = (res.headers?.getSetCookie?.() ?? []).map((str) => {
    const cookie = parseSetCookie(str);
    delete cookie.domain;
    cookie.secure = false;
    cookie.sameSite = "lax";
    return serialize(cookie, { encode: String });
  });
  const id = res.data?.data?.id;
  if (id) {
    cookies.push(
      serialize(USER_ID_COOKIE, signUserId(id), {
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
      }),
    );
  }
  if (cookies.length) set.headers["set-cookie"] = cookies;
  return res.data;
}
