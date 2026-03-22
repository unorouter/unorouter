import { AUTH_COOKIES, handleAuthResponse } from "@/lib/api/auth";
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_REDIRECT_COOKIE,
  COOKIE_MAX_AGE,
  USER_ID_COOKIE,
} from "@/lib/config/constants";
import {
  loginBody,
  oauthCallbackQuery,
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
import { Elysia, redirect } from "elysia";
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
      const res = await generateOAuthCode(
        { aff: query.aff, redirect_uri: query.redirect },
        upstream,
      );
      return res.data!;
    },
    { query: oauthStateQuery },
  )

  .get(
    "/oauth/callback",
    async ({ query, cookie, set }) => {
      const token = query.access_token;
      const userId = query.user_id;
      if (!token || !userId) return redirect("/login");

      // Set auth cookies (access_token for API auth, user-id for middleware)
      cookie[ACCESS_TOKEN_COOKIE].set({
        value: token,
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
        httpOnly: true,
      });
      cookie[USER_ID_COOKIE].set({
        value: userId,
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
      });

      // Read and clear the auth redirect cookie
      const redirectTo = String(cookie[AUTH_REDIRECT_COOKIE]?.value || "");
      if (redirectTo) {
        cookie[AUTH_REDIRECT_COOKIE].remove();
      }

      set.status = 302;
      set.headers.location = redirectTo || "/dashboard";
    },
    { query: oauthCallbackQuery },
  )

  .get(
    "/verification",
    async ({ query, upstream }) => {
      const res = await sendEmailVerification(query, upstream);
      return res.data!;
    },
    { query: verificationQuery },
  );
