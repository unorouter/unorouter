import {
  clearSessionCookies,
  handleAuthResponse,
  setSessionCookies,
} from "@/lib/api/auth";
import {
  loginBody,
  oauthCallbackQuery,
  oauthStateQuery,
  oauthUnbindParams,
  passwordResetBody,
  registerBody,
} from "@/lib/api/typebox/auth";
import { twoFALoginBody, verificationQuery } from "@/lib/api/typebox/common";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
import { sanitizeRedirectPath } from "@/lib/utils/server";
import {
  exchangeOAuthCode,
  generateOAuthCode,
  getStatus,
  login,
  logout,
  register,
  resetPassword,
  selfClearBinding,
  sendEmailVerification,
  sendPasswordResetEmail,
  verify2FALogin,
} from "@/openapi";
import { resolveSelf } from "@/server/auth/account/self.service";
import { deriveUpstream } from "@/server/constants";
import { Elysia } from "elysia";

export const authRoute = new Elysia({ prefix: "/account" })
  .derive(deriveUpstream)
  .post(
    "/login",
    async ({ body, cookie, upstream }) => {
      const { turnstile, ...loginRequest } = body;
      const res = await login(
        loginRequest,
        { turnstile },
        { headers: upstream.headers },
      );
      return await handleAuthResponse(res, cookie);
    },
    { body: loginBody },
  )

  .post(
    "/login/2fa",
    async ({ body, cookie, upstream }) => {
      const res = await verify2FALogin(body, {
        headers: upstream.headers,
      });
      return await handleAuthResponse(res, cookie);
    },
    { body: twoFALoginBody },
  )

  .post(
    "/register",
    async ({ body, cookie, upstream }) => {
      const { turnstile, ...registerRequest } = body;
      const res = await register(
        registerRequest,
        { turnstile },
        { headers: upstream.headers },
      );
      return await handleAuthResponse(res, cookie);
    },
    { body: registerBody },
  )

  .get("/logout", async ({ cookie, upstream }) => {
    const res = await logout(upstream);
    for (const name of Object.keys(cookie)) {
      cookie[name].remove();
    }
    clearSessionCookies(cookie);
    return unwrap(res);
  })

  // 419 is the expired-session status; 401 is a plain guest.
  .get("/self", async ({ cookie, request, status }) => {
    const self = await resolveSelf(request, cookie);
    return self.user ?? status(self.expired ? 419 : 401);
  })

  .get("/status", async () => {
    const res = await getStatus();
    return unwrap(res);
  })

  .get(
    "/oauth/state",
    async ({ query, upstream }) => {
      const res = await generateOAuthCode(
        {
          provider: query.provider,
          aff: query.aff,
          redirect_uri: query.redirect,
          action: query.action,
        },
        upstream,
      );
      return unwrap(res);
    },
    { query: oauthStateQuery },
  )

  .get(
    "/oauth/callback",
    async ({ query, cookie, set }) => {
      // Not Elysia's redirect(): it leaves the location RELATIVE, and Next
      // re-parses that through undici on the way out, which rejects "/login"
      // with "Failed to parse URL from /login" and shows a 500 instead.
      const to = (location: string) => {
        set.status = 302;
        set.headers.location = location;
      };

      if (query.error)
        return to(`/settings?bind_error=${encodeURIComponent(query.error)}`);
      if (!query.code) return to("/login");

      const res = await exchangeOAuthCode({ code: query.code }).catch(
        () => null,
      );
      if (!res?.data || !("success" in res.data) || !res.data.success)
        return to("/login");

      const data = res.data.data;
      if (data.action === "bind") return to("/settings");

      await setSessionCookies(
        cookie,
        data.user_id,
        data.access_token,
        data.access_expires_at,
      );

      const redirectTo = String(cookie[AUTH_REDIRECT_COOKIE]?.value || "");
      if (redirectTo) cookie[AUTH_REDIRECT_COOKIE].remove();
      to(sanitizeRedirectPath(redirectTo) ?? "/dashboard");
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
  )

  .get(
    "/reset-password",
    async ({ query, upstream }) => {
      const res = await sendPasswordResetEmail(query, upstream);
      return unwrap(res);
    },
    { query: verificationQuery },
  )

  .post(
    "/reset-password/confirm",
    async ({ body, upstream }) => {
      const res = await resetPassword(body, upstream);
      return unwrap(res);
    },
    { body: passwordResetBody },
  );
