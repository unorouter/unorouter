import { AUTH_USER_ID_COOKIE } from "@/lib/config/constants";
import {
  loginBody,
  oauthStateQuery,
  registerBody,
  verificationQuery,
  verify2FABody,
} from "@/lib/typebox/auth";
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

function getUserHeaders(request: Request): Record<string, string> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const headers: Record<string, string> = {};
  if (!cookieHeader) return headers;

  headers.cookie = cookieHeader;
  const userId = parseCookie(cookieHeader)[AUTH_USER_ID_COOKIE];
  if (userId) headers["New-Api-User"] = userId;

  return headers;
}

function forwardCookies(res: { headers?: Headers }, set: Context["set"]) {
  const raw = res.headers?.getSetCookie?.() ?? [];
  if (raw.length === 0) return;

  const cookies = raw.map((str) => {
    const cookie = parseSetCookie(str);
    delete cookie.domain;
    cookie.secure = false;
    cookie.sameSite = "lax";
    return serialize(cookie, { encode: String });
  });
  set.headers["set-cookie"] = cookies;
}

type LoginResponse = { success: boolean; data?: { id: number } };

const USER_ID_COOKIE_OPTS = {
  path: "/",
  maxAge: 2592000,
  sameSite: "lax" as const,
};

function handleLoginResponse(
  res: { data?: unknown; headers?: Headers },
  set: Context["set"],
  cookie: Record<string, { set: (opts: object) => void }>,
) {
  forwardCookies(res, set);
  const data = res.data as LoginResponse;
  if (data?.success && data.data?.id) {
    cookie[AUTH_USER_ID_COOKIE].set({
      value: String(data.data.id),
      ...USER_ID_COOKIE_OPTS,
    });
  }
  return data;
}

export const authRoute = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, request, set, cookie }) => {
      const res = await login({
        body: JSON.stringify(body),
        headers: getUserHeaders(request),
      });
      return handleLoginResponse(res, set, cookie);
    },
    { body: loginBody },
  )

  .post(
    "/login/2fa",
    async ({ body, request, set, cookie }) => {
      const res = await verify2FALogin({
        body: JSON.stringify(body),
        headers: getUserHeaders(request),
      });
      return handleLoginResponse(res, set, cookie);
    },
    { body: verify2FABody },
  )

  .post(
    "/register",
    async ({ body, request, set }) => {
      const res = await register(body as unknown as Blob, {
        body: JSON.stringify(body),
        headers: getUserHeaders(request),
      });
      forwardCookies(res, set);
      return res.data!;
    },
    { body: registerBody },
  )

  .get("/logout", async ({ request, set, cookie }) => {
    const res = await logout({ headers: getUserHeaders(request) });
    forwardCookies(res, set);
    cookie[AUTH_USER_ID_COOKIE].set({ value: "", path: "/", maxAge: 0 });
    return res.data!;
  })

  .get("/self", async ({ request }) => {
    const res = await getSelf({ headers: getUserHeaders(request) });
    return res.data!;
  })

  .get("/status", async () => {
    const res = await getStatus();
    return res.data!;
  })

  .get(
    "/oauth/state",
    async ({ query, request }) => {
      const params: Record<string, string> = {};
      if (query.redirect) params.redirect = query.redirect;
      if (query.aff) params.aff = query.aff;
      const res = await generateOAuthCode(params, {
        headers: getUserHeaders(request),
      });
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
