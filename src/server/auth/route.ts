import { AUTH_USER_ID_COOKIE } from "@/lib/config/constants";
import {
  loginBody,
  oauthStateQuery,
  registerBody,
  verificationQuery,
  verify2FABody,
} from "@/lib/typebox/auth";
import type { loginResponse } from "@/openapi";
import {
  generateOAuthCode,
  getSelf,
  getStatus,
  login,
  logout,
  register,
  sendEmailVerification,
  verify2FALogin,
} from "@/openapi";
import { parseCookie, parseSetCookie, serialize } from "cookie";
import { Context, Elysia } from "elysia";

function rewriteCookies(headers: Headers): string[] {
  return (headers?.getSetCookie?.() ?? []).map((str) => {
    const cookie = parseSetCookie(str);
    delete cookie.domain;
    cookie.secure = false;
    cookie.sameSite = "lax";
    return serialize(cookie, { encode: String });
  });
}

function handleLogin(res: loginResponse, set: Context["set"]) {
  const cookies = rewriteCookies(res.headers);
  const id = res.data?.data?.id;
  if (id) {
    cookies.push(
      serialize(AUTH_USER_ID_COOKIE, String(id), {
        path: "/",
        maxAge: 2592000,
        sameSite: "lax",
      }),
    );
  }
  if (cookies.length) set.headers["set-cookie"] = cookies;
  return res.data;
}

export const authRoute = new Elysia({ prefix: "/auth" })
  .derive(({ request }) => {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const headers: Record<string, string> = {};
    if (cookieHeader) {
      headers.cookie = cookieHeader;
      const userId = parseCookie(cookieHeader)[AUTH_USER_ID_COOKIE];
      if (userId) headers["New-Api-User"] = userId;
    }
    return { upstream: headers };
  })

  .post(
    "/login",
    async ({ body, set, upstream }) => {
      const res = await login({
        body: JSON.stringify(body),
        headers: upstream,
      });
      return handleLogin(res, set);
    },
    { body: loginBody },
  )

  .post(
    "/login/2fa",
    async ({ body, set, upstream }) => {
      const res = await verify2FALogin({
        body: JSON.stringify(body),
        headers: upstream,
      });
      return handleLogin(res, set);
    },
    { body: verify2FABody },
  )

  .post(
    "/register",
    async ({ body, set, upstream }) => {
      const res = await register(body as unknown as Blob, {
        body: JSON.stringify(body),
        headers: upstream,
      });
      const cookies = rewriteCookies(res.headers);
      if (cookies.length) set.headers["set-cookie"] = cookies;
      return res.data!;
    },
    { body: registerBody },
  )

  .get("/logout", async ({ set, upstream }) => {
    const res = await logout({ headers: upstream });
    const cookies = rewriteCookies(res.headers);
    cookies.push(
      serialize(AUTH_USER_ID_COOKIE, "", { path: "/", maxAge: 0, sameSite: "lax" }),
    );
    set.headers["set-cookie"] = cookies;
    return res.data!;
  })

  .get("/self", async ({ upstream }) => {
    const res = await getSelf({ headers: upstream });
    return res.data!;
  })

  .get("/status", async () => {
    const res = await getStatus();
    return res.data!;
  })

  .get(
    "/oauth/state",
    async ({ query, upstream }) => {
      const params: Record<string, string> = {};
      if (query.redirect) params.redirect = query.redirect;
      if (query.aff) params.aff = query.aff;
      const res = await generateOAuthCode(params, { headers: upstream });
      return res.data!;
    },
    { query: oauthStateQuery },
  )

  .get(
    "/verification",
    async ({ query }) => {
      const res = await sendEmailVerification({ email: query.email });
      return res.data!;
    },
    { query: verificationQuery },
  );
