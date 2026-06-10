import { handleAuthResponse } from "@/lib/api/auth";
import {
  loginBody,
  oauthCallbackQuery,
  oauthStateQuery,
  oauthUnbindParams,
  registerBody,
} from "@/lib/api/typebox/auth";
import { twoFACodeBody, verificationQuery } from "@/lib/api/typebox/common";
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_REDIRECT_COOKIE,
  COOKIE_MAX_AGE,
  USER_ID_COOKIE,
} from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { signUserId } from "@/lib/utils/server";
import {
  exchangeOAuthCode,
  generateOAuthCode,
  getSelf,
  getStatus,
  login,
  logout,
  register,
  selfClearBinding,
  sendEmailVerification,
  verify2FALogin,
} from "@/openapi";
import { Elysia, redirect } from "elysia";
import { deriveUpstream } from "@/server/constants";

export const authRoute = new Elysia({ prefix: "/account" })
  .derive(deriveUpstream)
  .post(
    "/login",
    async ({ body, set, upstream }) => {
      const { turnstile, ...loginRequest } = body;
      const res = await login(
        loginRequest,
        { turnstile },
        { headers: upstream.headers },
      );
      return await handleAuthResponse(res, set);
    },
    { body: loginBody },
  )

  .post(
    "/login/2fa",
    async ({ body, set, upstream }) => {
      const res = await verify2FALogin(body, {
        headers: upstream.headers,
      });
      return await handleAuthResponse(res, set);
    },
    { body: twoFACodeBody },
  )

  .post(
    "/register",
    async ({ body, set, upstream }) => {
      const { turnstile, ...registerRequest } = body;
      const res = await register(
        registerRequest,
        { turnstile },
        { headers: upstream.headers },
      );
      return await handleAuthResponse(res, set);
    },
    { body: registerBody },
  )

  .get("/logout", async ({ cookie, upstream }) => {
    const res = await logout(upstream);
    for (const name of Object.keys(cookie)) {
      cookie[name].remove();
    }
    return unwrap(res);
  })

  .get("/self", async ({ upstream }) => {
    const res = await getSelf(upstream);
    return unwrap(res);
  })

  .get("/status", async () => {
    const res = await getStatus();
    return unwrap(res);
  })

  .get(
    "/oauth/state",
    async ({ query, upstream }) => {
      const res = await generateOAuthCode(
        { aff: query.aff, redirect_uri: query.redirect, action: query.action },
        upstream,
      );
      return unwrap(res);
    },
    { query: oauthStateQuery },
  )

  .get(
    "/oauth/callback",
    async ({ query, cookie, set }) => {
      // Failed bind/login bounces back with ?error instead of a code; surface
      // it on settings. encodeURIComponent guards param injection.
      if (query.error) {
        set.status = 302;
        set.headers.location = `/settings?bind_error=${encodeURIComponent(
          query.error,
        )}`;
        return;
      }
      if (!query.code) return redirect("/login");

      // Missing/expired/redeemed code makes the exchange throw; treat any
      // failure as invalid and bounce to login.
      let res;
      try {
        res = await exchangeOAuthCode({ code: query.code });
      } catch {
        return redirect("/login");
      }
      if (!res.data || !("success" in res.data) || !res.data.success)
        return redirect("/login");

      const data = res.data.data;

      // Bind flow: user is already logged in, just redirect to settings
      if (data.action === "bind") {
        set.status = 302;
        set.headers.location = "/settings";
        return;
      }

      // Login flow: set auth cookies
      cookie[ACCESS_TOKEN_COOKIE].set({
        value: data.access_token,
        path: "/",
        maxAge: COOKIE_MAX_AGE,
        sameSite: "lax",
        httpOnly: true,
      });
      cookie[USER_ID_COOKIE].set({
        value: await signUserId(data.user_id),
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

  .delete(
    "/bindings/:binding_type",
    async ({ params, upstream }) => {
      const res = await selfClearBinding(params.binding_type, upstream);
      return unwrap(res);
    },
    { params: oauthUnbindParams },
  )

  .get(
    "/verification",
    async ({ query, upstream }) => {
      const res = await sendEmailVerification(query, upstream);
      return unwrap(res);
    },
    { query: verificationQuery },
  );
