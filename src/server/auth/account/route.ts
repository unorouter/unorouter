import {
  accessTokenMaxAge,
  handleAuthResponse,
  refreshCookieDescriptor,
  reissueRefreshCookie,
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
  REFRESH_TOKEN_COOKIE,
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
import { stringifySetCookie } from "cookie";
import { Elysia, redirect } from "elysia";
import { deriveUpstream, upstreamApiUrl } from "@/server/constants";
import { sanitizeRedirectPath } from "@/lib/utils/server";

type RefreshResult = {
  data: { data: unknown; headers: Headers } | null;
  accessToken: string | null;
  accessExpiresAt: number | undefined;
  userId: number | null;
};

const NO_REFRESH: RefreshResult = {
  data: null,
  accessToken: null,
  accessExpiresAt: undefined,
  userId: null,
};

// Hand-wired call to upstream's raw-gin refresh endpoint (not in the openapi
// spec, so Orval generated no client). Forwards only the refresh cookie and
// reads the JWT + rolled refresh cookie off the response.
async function callUpstreamRefresh(
  refreshValue: string,
): Promise<RefreshResult> {
  try {
    const res = await fetch(`${upstreamApiUrl}/api/user/auth/refresh`, {
      method: "POST",
      headers: { cookie: `${REFRESH_TOKEN_COOKIE}=${refreshValue}` },
    });
    if (!res.ok) return NO_REFRESH;
    const body = (await res.json().catch(() => null)) as {
      success?: boolean;
      data?: {
        access_token?: string;
        access_expires_at?: number;
        user?: { id?: string | number };
      };
    } | null;
    if (!body?.success || !body.data?.access_token) return NO_REFRESH;
    const rawId = body.data.user?.id;
    return {
      data: { data: body, headers: res.headers },
      accessToken: body.data.access_token,
      accessExpiresAt: body.data.access_expires_at,
      userId: rawId == null ? null : Number(rawId),
    };
  } catch {
    return NO_REFRESH;
  }
}

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

  .get("/self", async ({ upstream }) => {
    const res = await getSelf(upstream);
    return unwrap(res);
  })

  .get("/status", async () => {
    const res = await getStatus();
    return unwrap(res);
  })

  // Stateless-token refresh. Reads the browser's re-domained refresh cookie,
  // hand-calls upstream's raw-gin refresh (Orval has no client for it), then on
  // success re-sets the capped access_token cookie + identity cookies and rolls
  // the refresh cookie. On failure clears the auth cookies and returns 401.
  .post("/auth/refresh", async ({ cookie, set }) => {
    const refreshValue = String(cookie[REFRESH_TOKEN_COOKIE]?.value || "");
    const result = refreshValue
      ? await callUpstreamRefresh(refreshValue)
      : NO_REFRESH;

    if (!result.data || !result.accessToken || result.userId == null) {
      for (const name of [
        ACCESS_TOKEN_COOKIE,
        USER_ID_COOKIE,
        LOCAL_USER_ID_COOKIE,
        REFRESH_TOKEN_COOKIE,
      ]) {
        cookie[name]?.remove();
      }
      set.status = 401;
      return { success: false };
    }

    const cookies: string[] = [];
    for (const descriptor of await sessionCookieDescriptors(result.userId, {
      accessToken: result.accessToken,
      accessMaxAge: accessTokenMaxAge(result.accessExpiresAt),
    })) {
      cookies.push(stringifySetCookie(descriptor));
    }
    const rolled = reissueRefreshCookie(result.data.headers);
    if (rolled) cookies.push(rolled);
    set.headers["set-cookie"] = cookies;
    return { success: true };
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

      // The generated OAuthExchangeData type omits access_expires_at; upstream
      // still returns it (unix seconds), read structurally to cap the token TTL.
      const accessExpiresAt = (data as { access_expires_at?: number })
        .access_expires_at;
      for (const descriptor of await sessionCookieDescriptors(data.user_id, {
        accessToken: data.access_token,
        accessMaxAge: accessTokenMaxAge(accessExpiresAt),
      })) {
        cookie[descriptor.name].set({
          value: descriptor.value,
          path: descriptor.path,
          maxAge: descriptor.maxAge,
          sameSite: descriptor.sameSite,
          httpOnly: descriptor.httpOnly,
        });
      }

      const refresh = refreshCookieDescriptor(res.headers);
      if (refresh) {
        cookie[refresh.name].set({
          value: refresh.value,
          path: refresh.path,
          maxAge: refresh.maxAge,
          sameSite: refresh.sameSite,
          httpOnly: refresh.httpOnly,
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
