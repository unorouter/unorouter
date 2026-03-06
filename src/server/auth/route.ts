import { AUTH_COOKIES, handleLogin, rewriteCookies } from "@/lib/api/auth";
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
import { deriveUpstream } from "@/server/upstream";
import { Elysia } from "elysia";

export const authRoute = new Elysia({ prefix: "/auth" })
  .derive(deriveUpstream)
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

  .get("/logout", async ({ cookie, upstream }) => {
    const res = await logout({ headers: upstream });
    for (const name of AUTH_COOKIES) {
      cookie[name].remove();
    }
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
