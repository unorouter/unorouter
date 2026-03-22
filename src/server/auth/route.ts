import { AUTH_COOKIES, handleAuthResponse } from "@/lib/api/auth";
import { AUTH_REDIRECT_COOKIE, USER_ID_COOKIE } from "@/lib/config/constants";
import {
  loginBody,
  oauthStateQuery,
  oauthTokenQuery,
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
import { serialize } from "cookie";
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
    async ({ query, cookie }) => {
      const token = query.access_token;
      if (!token) return redirect("/login");

      const res = await getSelf({
        headers: { Authorization: token },
      });
      const userData = res.data?.data;
      if (!userData?.id) return redirect("/login");

      // Read and clear the auth redirect cookie
      const redirectTo = String(cookie[AUTH_REDIRECT_COOKIE]?.value || "");
      const headers = new Headers();
      headers.append(
        "set-cookie",
        serialize(USER_ID_COOKIE, String(userData.id), {
          path: "/",
          maxAge: 2592000,
          sameSite: "lax",
        }),
      );
      headers.append(
        "set-cookie",
        serialize("access_token", token, {
          path: "/",
          maxAge: 2592000,
          sameSite: "lax",
          httpOnly: true,
        }),
      );
      if (redirectTo) {
        headers.append(
          "set-cookie",
          serialize(AUTH_REDIRECT_COOKIE, "", {
            path: "/",
            maxAge: 0,
          }),
        );
      }
      headers.set("location", redirectTo || "/dashboard");
      return new Response(null, { status: 302, headers });
    },
    { query: oauthTokenQuery },
  )

  .get(
    "/verification",
    async ({ query, upstream }) => {
      const res = await sendEmailVerification(query, upstream);
      return res.data!;
    },
    { query: verificationQuery },
  );
