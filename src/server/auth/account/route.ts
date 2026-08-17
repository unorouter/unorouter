import {
  accessTokenMaxAge,
  clearSessionCookies,
  handleAuthResponse,
  sessionCookieDescriptors,
} from "@/lib/api/auth";
import {
  loginBody,
  oauthCallbackQuery,
  oauthStateQuery,
  oauthUnbindParams,
  registerBody,
} from "@/lib/api/typebox/auth";
import { twoFALoginBody, verificationQuery } from "@/lib/api/typebox/common";
import { AUTH_REDIRECT_COOKIE } from "@/lib/config/constants";
import { unwrap } from "@/lib/utils/base";
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
import { Elysia } from "elysia";
import { deriveUpstream } from "@/server/constants";
import { sanitizeRedirectPath } from "@/lib/utils/server";

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
    { body: twoFALoginBody },
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

  .get("/logout", async ({ cookie, set, upstream }) => {
    const res = await logout(upstream);
    for (const name of Object.keys(cookie)) {
      cookie[name].remove();
    }
    // The session cookies were set through a raw header, so the jar above never
    // tracked them and would leave the user logged in after logging out.
    clearSessionCookies(set);
    return unwrap(res);
  })

  .get("/self", async ({ set, upstream }) => {
    // Session cookies can outlive the upstream token (revoked, or expiry drift
    // between cookie maxAge and the token's real lifetime). Clearing them here
    // is what stops the client sitting half-logged-in with a dead credential,
    // where every action 401s and the only escape is clearing cookies by hand.
    // customFetch THROWS on a non-ok response, so this must be a catch: reading
    // `res.status === 401` after the await is unreachable code.
    try {
      return unwrap(await getSelf(upstream));
    } catch (err) {
      if ((err as { status?: number })?.status === 401) clearSessionCookies(set);
      throw err;
    }
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

      for (const descriptor of await sessionCookieDescriptors(data.user_id, {
        accessToken: data.access_token,
        accessMaxAge: accessTokenMaxAge(data.access_expires_at),
      })) {
        cookie[descriptor.name].set({
          value: descriptor.value,
          path: descriptor.path,
          maxAge: descriptor.maxAge,
          sameSite: descriptor.sameSite,
          httpOnly: descriptor.httpOnly,
        });
      }

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
  );
