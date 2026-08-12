import {
  accessTokenMaxAge,
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
import {
  ACCESS_TOKEN_COOKIE,
  AUTH_REDIRECT_COOKIE,
  LOCAL_USER_ID_COOKIE,
  USER_ID_COOKIE,
} from "@/lib/config/constants";
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
import { Elysia, redirect } from "elysia";
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

  .get("/logout", async ({ cookie, upstream }) => {
    const res = await logout(upstream);
    for (const name of Object.keys(cookie)) {
      cookie[name].remove();
    }
    return unwrap(res);
  })

  .get("/self", async ({ cookie, upstream }) => {
    const res = await getSelf(upstream);
    // Session cookies can outlive the upstream token (revoked, or expiry
    // drift between cookie maxAge and the token's real lifetime). Without
    // this the client sits half-logged-in with a dead credential and every
    // action 401s until a manual re-login.
    // Orval only types the 200 branch; upstream really returns 401 here.
    if ((res.status as number) === 401) {
      for (const name of [
        ACCESS_TOKEN_COOKIE,
        USER_ID_COOKIE,
        LOCAL_USER_ID_COOKIE,
      ]) {
        if (cookie[name]?.value) cookie[name].remove();
      }
    }
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
      if (query.error) {
        set.status = 302;
        set.headers.location = `/settings?bind_error=${encodeURIComponent(
          query.error,
        )}`;
        return;
      }
      if (!query.code) return redirect("/login");

      let res;
      try {
        res = await exchangeOAuthCode({ code: query.code });
      } catch {
        return redirect("/login");
      }
      if (!res.data || !("success" in res.data) || !res.data.success)
        return redirect("/login");

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
