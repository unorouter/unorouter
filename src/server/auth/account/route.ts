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
import {
  AUTH_REDIRECT_COOKIE,
  AUTH_REDIRECT_QUERY,
  LOCALES,
  NEW_API_USER,
  OAUTH_ERROR_QUERY,
  OAUTH_FLOW_COOKIE,
  OAUTH_BIND_FLOW_COOKIE,
  LOGIN_CHALLENGE_COOKIE,
} from "@/lib/config/constants";
import { env } from "@/lib/config/env";
import { unwrap } from "@/lib/utils/base";
import { sanitizeRedirectPath } from "@/lib/utils/server";
import {
  exchangeOAuthCode,
  generateOAuthCodeQuery,
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
import { oauthVerifyResultPage } from "@/server/auth/account/oauth-verify.service";
import { resolveSelf } from "@/server/auth/account/self.service";
import { deriveUpstream } from "@/server/constants";
import { Elysia, t } from "elysia";
import { hasLocale } from "next-intl";

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

  // Server Components find expired sessions but cannot write cookies; they
  // redirect here so the dead token is cleared before /login.
  .get(
    "/expired",
    ({ cookie, query, set }) => {
      clearSessionCookies(cookie);
      const locale = hasLocale(LOCALES, query.locale)
        ? query.locale
        : LOCALES[0];
      const next = query.next ? sanitizeRedirectPath(query.next) : null;
      const search = next
        ? `?${new URLSearchParams({ [AUTH_REDIRECT_QUERY]: next })}`
        : "";
      set.status = 302;
      set.headers.location = `/${locale}/login${search}`;
    },
    { query: t.Object({ locale: t.String(), next: t.Optional(t.String()) }) },
  )

  // 419 is the expired-session status; 401 is a plain guest.
  .get("/self", async ({ cookie, request, status }) => {
    const self = await resolveSelf(request, cookie);
    return self.user ?? status(self.expired ? 419 : 401);
  })

  .get("/status", async () => unwrap(await getStatus()))

  .get(
    "/oauth/state",
    async ({ query, upstream, cookie }) => {
      const res = await generateOAuthCodeQuery(
        { ...query, redirect_uri: query.redirect },
        upstream,
      );
      const body = unwrap(res);
      const siteHost = new URL(env.siteOrigin).hostname;
      if (
        query.action === "bind" &&
        "data" in body &&
        typeof body.data === "string" &&
        siteHost.includes(".")
      )
        cookie[OAUTH_BIND_FLOW_COOKIE].set({
          value: body.data,
          domain: siteHost,
          path: "/api/oauth",
          maxAge: 15 * 60,
          httpOnly: true,
          secure: true,
          sameSite: "lax",
        });
      if ("data" in body && typeof body.data === "string")
        cookie[OAUTH_FLOW_COOKIE].set({
          value: body.data,
          path: "/api/auth/account/oauth",
          maxAge: 15 * 60,
          httpOnly: true,
          sameSite: "lax",
        });
      return body;
    },
    { query: oauthStateQuery },
  )

  .get(
    "/oauth/callback",
    async ({ query, cookie, set, request }) => {
      // Not Elysia's redirect(): it leaves the location RELATIVE, and Next
      // re-parses that through undici on the way out, which rejects "/login"
      // with "Failed to parse URL from /login" and shows a 500 instead.
      const to = (location: string) => {
        set.status = 302;
        set.headers.location = location;
      };

      if (query.verify)
        return await oauthVerifyResultPage({
          nonce: query.verify,
          code: query.code,
          error: query.error,
          cookie,
        });

      if (query.error) {
        // A failed bind comes from settings; a failed login has no session yet.
        const { upstream } = await deriveUpstream({ request });
        if (upstream.headers[NEW_API_USER])
          return to(`/settings?bind_error=${encodeURIComponent(query.error)}`);
        return to(
          `/login?${new URLSearchParams({ [OAUTH_ERROR_QUERY]: query.error })}`,
        );
      }
      if (!query.code) return to("/login");

      const res = await exchangeOAuthCode({ code: query.code }).catch(
        () => null,
      );
      if (!res?.data || !("success" in res.data) || !res.data.success)
        return to("/login");

      const data = res.data.data;
      if (data.action === "bind") return to("/settings");

      // A code is only good in the browser that started its flow: without this, a
      // code captured from the attacker's own login signed any victim into that account.
      const flow = String(cookie[OAUTH_FLOW_COOKIE]?.value || "");
      cookie[OAUTH_FLOW_COOKIE].set({
        value: "",
        path: "/api/auth/account/oauth",
        maxAge: 0,
      });
      if (!flow || !("state" in data) || data.state !== flow)
        return to("/login");

      // The account has 2FA or a passkey: no session yet, the login form asks for it.
      if (data.action === "login_verification") {
        if (!("flow_token" in data) || typeof data.flow_token !== "string")
          return to("/login");
        cookie[LOGIN_CHALLENGE_COOKIE].set({
          value: JSON.stringify({
            flow_token: data.flow_token,
            methods: "methods" in data ? data.methods : undefined,
          }),
          path: "/",
          maxAge: 5 * 60,
          sameSite: "lax",
        });
        return to("/login");
      }

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
    async ({ params, upstream }) =>
      unwrap(await selfClearBinding(params.binding_type, upstream)),
    { params: oauthUnbindParams },
  )

  .get(
    "/verification",
    async ({ query, upstream }) =>
      unwrap(await sendEmailVerification(query, upstream)),
    { query: verificationQuery },
  )

  .get(
    "/reset-password",
    async ({ query, upstream }) =>
      unwrap(await sendPasswordResetEmail(query, upstream)),
    { query: verificationQuery },
  )

  .post(
    "/reset-password/confirm",
    async ({ body, upstream }) => unwrap(await resetPassword(body, upstream)),
    { body: passwordResetBody },
  );
