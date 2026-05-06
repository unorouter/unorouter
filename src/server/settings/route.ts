import { twoFACodeBody, verificationQuery } from "@/lib/api/typebox/common";
import {
  emailBindQuery,
  passkeyCredentialBody,
  updateSelfBody,
  updateSettingBody,
} from "@/lib/api/typebox/settings";
import { unwrap } from "@/lib/utils/base";
import {
  deleteSelf,
  disable2FA,
  emailBind,
  enable2FA,
  generateAccessToken,
  get2FAStatus,
  passkeyDelete,
  passkeyRegisterBegin,
  passkeyRegisterFinish,
  passkeyStatus,
  sendEmailVerification,
  setup2FA,
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
      return unwrap(res);
    },
    { body: updateSelfBody },
  )

  .delete("/self", async ({ upstream }) => {
    const res = await deleteSelf({ headers: upstream.headers });
    return unwrap(res);
  })

  // Access token
  .get("/token", async ({ upstream }) => {
    const res = await generateAccessToken({ headers: upstream.headers });
    return unwrap(res);
  })

  // User settings (notifications)
  .post(
    "/setting",
    async ({ body, upstream }) => {
      const res = await updateUserSetting(body, {
        headers: upstream.headers,
      });
      return unwrap(res);
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
      return unwrap(res);
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
      return unwrap(res);
    },
    { query: emailBindQuery },
  )

  // 2FA
  .get("/2fa/status", async ({ upstream }) => {
    const res = await get2FAStatus({ headers: upstream.headers });
    return unwrap(res);
  })

  .post("/2fa/setup", async ({ upstream }) => {
    const res = await setup2FA({ headers: upstream.headers });
    return unwrap(res);
  })

  .post(
    "/2fa/enable",
    async ({ body, upstream }) => {
      const res = await enable2FA(body, { headers: upstream.headers });
      return unwrap(res);
    },
    { body: twoFACodeBody },
  )

  .post(
    "/2fa/disable",
    async ({ body, upstream }) => {
      const res = await disable2FA(body, { headers: upstream.headers });
      return unwrap(res);
    },
    { body: twoFACodeBody },
  )

  // Passkey
  .get("/passkey", async ({ upstream }) => {
    const res = await passkeyStatus({ headers: upstream.headers });
    return unwrap(res);
  })

  .post("/passkey/register/begin", async ({ upstream }) => {
    const res = await passkeyRegisterBegin({ headers: upstream.headers });
    return unwrap(res);
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
      return unwrap(res);
    },
    { body: passkeyCredentialBody },
  )

  .delete("/passkey", async ({ upstream }) => {
    const res = await passkeyDelete({ headers: upstream.headers });
    return unwrap(res);
  });
