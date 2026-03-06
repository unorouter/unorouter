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
import { Elysia } from "elysia";

export const authRoute = new Elysia({ prefix: "/auth" })
  .post(
    "/login",
    async ({ body }) => {
      const res = await login({ body: JSON.stringify(body) });
      return res.data!;
    },
    { body: loginBody },
  )

  .post(
    "/login/2fa",
    async ({ body }) => {
      const res = await verify2FALogin({ body: JSON.stringify(body) });
      return res.data!;
    },
    { body: verify2FABody },
  )

  .post(
    "/register",
    async ({ body }) => {
      const res = await register(body as unknown as Blob, {
        body: JSON.stringify(body),
      });
      return res.data!;
    },
    { body: registerBody },
  )

  .get("/logout", async () => {
    const res = await logout();
    return res.data!;
  })

  .get("/self", async () => {
    const res = await getSelf();
    return res.data!;
  })

  .get("/status", async () => {
    const res = await getStatus();
    return res.data!;
  })

  .get(
    "/oauth/state",
    async ({ query }) => {
      const params: Record<string, string> = {};
      if (query.redirect) params.redirect = query.redirect;
      if (query.aff) params.aff = query.aff;
      const res = await generateOAuthCode(params);
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
