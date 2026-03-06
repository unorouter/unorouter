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
import { Elysia, t } from "elysia";
import { getUserHeaders } from "../constants";
import { rewriteSetCookies } from "../cookies";

function extractCookies(
  res: { headers?: Headers },
  set: { headers: Record<string, string | string[] | number> },
) {
  if (!res.headers) return;
  const cookies = rewriteSetCookies(res.headers);
  if (cookies.length > 0) {
    set.headers["set-cookie"] = cookies;
  }
}

export const authRoute = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body, request, set }) => {
      const res = await login({
        body: JSON.stringify(body),
        headers: {
          ...getUserHeaders(request),
        },
      });
      extractCookies(res, set);
      return res.data;
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
        turnstile: t.Optional(t.String()),
      }),
    },
  )

  .post(
    "/login/2fa",
    async ({ body, request, set }) => {
      const res = await verify2FALogin({
        body: JSON.stringify(body),
        headers: {
          ...getUserHeaders(request),
        },
      });
      extractCookies(res, set);
      return res.data;
    },
    {
      body: t.Object({
        code: t.String(),
      }),
    },
  )

  .post(
    "/register",
    async ({ body, request, set }) => {
      const res = await register(body as any, {
        body: JSON.stringify(body),
        headers: {
          ...getUserHeaders(request),
        },
      });
      extractCookies(res, set);
      return res.data;
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
        email: t.Optional(t.String()),
        verification_code: t.Optional(t.String()),
        aff_code: t.Optional(t.String()),
        turnstile: t.Optional(t.String()),
      }),
    },
  )

  .get("/logout", async ({ request, set }) => {
    const res = await logout({
      headers: getUserHeaders(request),
    });
    extractCookies(res, set);
    return res.data;
  })

  .get("/self", async ({ request }) => {
    const res = await getSelf({
      headers: getUserHeaders(request),
    });
    return res.data as {
      success: boolean;
      message: string;
      data: {
        id: number;
        username: string;
        display_name: string;
        role: number;
        status: number;
        group: string;
      };
    };
  })

  .get("/status", async () => {
    const res = await getStatus();
    return res.data;
  })

  .get(
    "/oauth/state",
    async ({ query, request }) => {
      const params: Record<string, string> = {};
      if (query.redirect) params.redirect = query.redirect;
      if (query.aff) params.aff = query.aff;
      const res = await generateOAuthCode(params as any, {
        headers: getUserHeaders(request),
      });
      return res.data;
    },
    {
      query: t.Object({
        redirect: t.Optional(t.String()),
        aff: t.Optional(t.String()),
      }),
    },
  )

  .get(
    "/verification",
    async ({ query }) => {
      const res = await sendEmailVerification({ email: query.email });
      return res.data;
    },
    {
      query: t.Object({
        email: t.String(),
      }),
    },
  );
