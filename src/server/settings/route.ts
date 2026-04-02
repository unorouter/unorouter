import { twoFACodeBody, verificationQuery } from "@/lib/typebox/common";
import {
  emailBindQuery,
  passkeyCredentialBody,
  updateSelfBody,
  updateSettingBody,
} from "@/lib/typebox/settings";
import {
  deleteSelf,
  disable2FA,
  emailBind,
  enable2FA,
  generateAccessToken,
  get2FAStatus,
  getUserOAuthBindings,
  passkeyDelete,
  passkeyRegisterBegin,
  passkeyRegisterFinish,
  passkeyStatus,
  sendEmailVerification,
  setup2FA,
  unbindCustomOAuth,
  updateSelf,
  updateUserSetting,
} from "@/openapi";
import { Elysia } from "elysia";
import { deriveUpstream } from "../constants";

export const settingsRoute = new Elysia({ prefix: "/settings" })
  .derive(deriveUpstream)

  .put(
    "/self",
    async ({ body, upstream }) => {
      const res = await updateSelf({
        headers: {
          "Content-Type": "application/json",
          ...upstream.headers,
        },
        body: JSON.stringify(body),
      });
      return res.data!;
    },
    { body: updateSelfBody },
  )

  .delete("/self", async ({ upstream }) => {
    const res = await deleteSelf({ headers: upstream.headers });
    return res.data!;
  })

  // Access token
  .get("/token", async ({ upstream }) => {
    const res = await generateAccessToken({ headers: upstream.headers });
    return res.data!;
  })

  // User settings (notifications)
  .post(
    "/setting",
    async ({ body, upstream }) => {
      const res = await updateUserSetting(body, {
        headers: upstream.headers,
      });
      return res.data!;
    },
    { body: updateSettingBody },
  )

  // Email verification
  .get(
    "/verification",
    async ({ query, upstream }) => {
      const res = await sendEmailVerification(
        { email: query.email, turnstile: query.turnstile },
        { headers: upstream.headers },
      );
      return res.data!;
    },
    { query: verificationQuery },
  )

  // Email bind
  .get(
    "/email/bind",
    async ({ query, upstream }) => {
      const res = await emailBind(
        { email: query.email, code: query.code },
        { headers: upstream.headers },
      );
      return res.data!;
    },
    { query: emailBindQuery },
  )

  // 2FA
  .get("/2fa/status", async ({ upstream }) => {
    const res = await get2FAStatus({ headers: upstream.headers });
    return res.data!;
  })

  .post("/2fa/setup", async ({ upstream }) => {
    const res = await setup2FA({ headers: upstream.headers });
    return res.data!;
  })

  .post(
    "/2fa/enable",
    async ({ body, upstream }) => {
      const res = await enable2FA(body, { headers: upstream.headers });
      return res.data!;
    },
    { body: twoFACodeBody },
  )

  .post(
    "/2fa/disable",
    async ({ body, upstream }) => {
      const res = await disable2FA(body, { headers: upstream.headers });
      return res.data!;
    },
    { body: twoFACodeBody },
  )

  // Passkey
  .get("/passkey", async ({ upstream }) => {
    const res = await passkeyStatus({ headers: upstream.headers });
    return res.data!;
  })

  .post("/passkey/register/begin", async ({ upstream }) => {
    const res = await passkeyRegisterBegin({ headers: upstream.headers });
    return res.data!;
  })

  .post(
    "/passkey/register/finish",
    async ({ body, upstream }) => {
      const res = await passkeyRegisterFinish({
        headers: {
          "Content-Type": "application/json",
          ...upstream.headers,
        },
        body: JSON.stringify(body),
      });
      return res.data!;
    },
    { body: passkeyCredentialBody },
  )

  .delete("/passkey", async ({ upstream }) => {
    const res = await passkeyDelete({ headers: upstream.headers });
    return res.data!;
  })

  // OAuth bindings
  .get("/oauth/bindings", async ({ upstream }) => {
    const res = await getUserOAuthBindings({ headers: upstream.headers });
    return res.data!;
  })

  .delete("/oauth/bindings/:providerId", async ({ params, upstream }) => {
    const res = await unbindCustomOAuth(params.providerId, {
      headers: upstream.headers,
    });
    return res.data!;
  });
