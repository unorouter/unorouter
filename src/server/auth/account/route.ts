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

  // 419 rather than 401 for an expired session: both mean "no user", but only
  // the expired case leaves a client that believed it was logged in, and it is
  // the status that tells the client to re-check instead of trusting a
  // logged-out prefetch it never asked to be given.
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
      // Elysia's redirect() builds a Response whose location stays relative, and
      // Next re-parses that through undici on the way out ("Failed to parse URL
      // from /login", a 500 the visitor sees instead of the login page). Every
      // other branch here sets the header itself for that reason; these did not,
      // so any OAuth attempt that failed upstream died on an error page with no
      // way back. Assign the header directly like the rest of the handler.
      const toLogin = () => {
        set.status = 302;
        set.headers.location = "/login";
      };
      if (query.error) {
        set.status = 302;
        set.headers.location = `/settings?bind_error=${encodeURIComponent(
          query.error,
        )}`;
        return;
      }
      if (!query.code) return toLogin();

      let res;
      try {
        res = await exchangeOAuthCode({ code: query.code });
      } catch {
        return toLogin();
      }
      if (!res.data || !("success" in res.data) || !res.data.success)
        return toLogin();

      const data = res.data.data;

      if (data.action === "bind") {
        set.status = 302;
        set.headers.location = "/settings";
        return;
      }

      await setSessionCookies(
        cookie,
        data.user_id,
        data.access_token,
        data.access_expires_at,
      );

      const redirectTo = String(cookie[AUTH_REDIRECT_COOKIE]?.value || "");
      if (redirectTo) {
        cookie[AUTH_REDIRECT_COOKIE].remove();
      }

      set.status = 302;
      set.headers.location = sanitizeRedirectPath(redirectTo) ?? "/dashboard";
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
