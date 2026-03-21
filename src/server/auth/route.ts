import { AUTH_COOKIES, handleAuthResponse } from "@/lib/api/auth";
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
import { deriveUpstream } from "../constants";

export const authRoute = new Elysia({ prefix: "/auth" })
  .derive(deriveUpstream)
  .post(
    "/login",
    async ({ body, set, upstream }) => {
      const { turnstile, ...loginRequest } = body;
      const res = await login(
        loginRequest,
        { turnstile },
        {
          headers: upstream.headers,
        },
      );
      return handleAuthResponse(res, set);
    },
    { body: loginBody },
  )

  .post(
    "/login/2fa",
    async ({ body, set, upstream }) => {
      const res = await verify2FALogin(body, {
        headers: upstream.headers,
      });
      return handleAuthResponse(res, set);
    },
    { body: verify2FABody },
  )

  .post(
    "/register",
    async ({ body, set, upstream }) => {
      const { turnstile, ...registerRequest } = body;
      const res = await register(
        registerRequest,
        { turnstile },
        {
          headers: upstream.headers,
        },
      );
      return handleAuthResponse(res, set);
    },
    { body: registerBody },
  )

  .get("/logout", async ({ cookie, upstream }) => {
    const res = await logout(upstream);
    for (const name of AUTH_COOKIES) {
      cookie[name].remove();
    }
    return res.data!;
  })

  .get("/self", async ({ upstream }) => {
    const res = await getSelf(upstream);
    return res.data!;
  })

  .get("/status", async () => {
    const res = await getStatus();
    return res.data!;
  })

  .get(
    "/oauth/state",
    async ({ query, upstream }) => {
      const res = await generateOAuthCode(query, upstream);
      return res.data!;
    },
    { query: oauthStateQuery },
  )

  .get(
    "/verification",
    async ({ query, upstream }) => {
      const res = await sendEmailVerification(query, upstream);
      return res.data!;
    },
    { query: verificationQuery },
  );
