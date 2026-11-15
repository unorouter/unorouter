import { setSessionCookies } from "@/lib/api/auth";
import { twoFAEnableBody, verificationQuery } from "@/lib/api/typebox/common";
import {
  emailBindQuery,
  passkeyRegisterFinishBody,
  passkeyVerifyBeginBody,
  oauthVerifyStateQuery,
  passkeyVerifyFinishBody,
  securityVerifyBody,
  updateSelfBody,
  updateSettingBody,
  updateTimeoutBody,
  verificationMethodsQuery,
} from "@/lib/api/typebox/settings";
import { unwrap } from "@/lib/utils/base";
import {
  type AuthRotationData,
  deleteSelf,
  disable2FA,
  emailBind,
  enable2FA,
  generateAccessToken,
  generateOAuthCodeQuery,
  get2FAStatus,
  getVerificationMethods,
  passkeyDelete,
  passkeyRegisterBegin,
  passkeyRegisterFinish,
  passkeyStatus,
  passkeyVerifyBegin,
  passkeyVerifyFinish,
  sendEmailVerification,
  setup2FA,
  universalVerify,
  updateSelf,
  updateTimeoutPreference,
  updateUserSetting,
} from "@/openapi";
import { Elysia, type Context } from "elysia";
import { deriveUpstream, getUserId } from "@/server/constants";

// Changing 2FA or the passkey bumps the user's auth version, so the old token
// stops working and the gateway hands back its replacement.
async function keepRotatedSession(
  cookie: Context["cookie"],
  data: AuthRotationData | undefined,
) {
  if (!data?.access_token) return;
  await setSessionCookies(
    cookie,
    await getUserId(cookie),
    data.access_token,
    data.access_expires_at,
  );
}

export const settingsRoute = new Elysia({ prefix: "/settings" })
  .derive(deriveUpstream)

  .put(
    "/self",
    async ({ body, upstream }) =>
      unwrap(
        await updateSelf({
          headers: {
            "Content-Type": "application/json",
            ...upstream.headers,
          },
          body: JSON.stringify(body),
        }),
      ),
    { body: updateSelfBody },
  )

  .delete("/self", async ({ upstream }) => unwrap(await deleteSelf(upstream)))

  // POST, not GET: Lax cookies ride a cross-site link, so a GET here rotated the
  // victim's token from any page they clicked.
  .post("/token", async ({ upstream }) =>
    unwrap(await generateAccessToken(upstream)),
  )

  .post(
    "/setting",
    async ({ body, upstream }) =>
      unwrap(await updateUserSetting(body, upstream)),
    { body: updateSettingBody },
  )

  .put(
    "/timeout",
    async ({ body, upstream }) =>
      unwrap(await updateTimeoutPreference(body, upstream)),
    { body: updateTimeoutBody },
  )

  .get(
    "/verification",
    async ({ query, upstream }) =>
      unwrap(await sendEmailVerification(query, upstream)),
    { query: verificationQuery },
  )

  // POST, not GET: the code only proves control of the NEW address, so a link
  // carrying the attacker's own address and code repointed the victim's reset email.
  .post(
    "/email/bind",
    async ({ body, upstream }) => unwrap(await emailBind(body, upstream)),
    { body: emailBindQuery },
  )

  .get("/2fa/status", async ({ upstream }) =>
    unwrap(await get2FAStatus(upstream)),
  )

  .get(
    "/verify/methods",
    async ({ query, upstream }) =>
      unwrap(await getVerificationMethods(query, upstream)),
    { query: verificationMethodsQuery },
  )

  .post(
    "/verify",
    async ({ body, upstream }) => unwrap(await universalVerify(body, upstream)),
    { body: securityVerifyBody },
  )

  .get(
    "/verify/oauth",
    async ({ query, upstream }) =>
      unwrap(
        await generateOAuthCodeQuery(
          {
            provider: query.provider,
            intent: "verify",
            scope: query.scope,
            redirect_uri: query.redirect,
          },
          upstream,
        ),
      ),
    { query: oauthVerifyStateQuery },
  )

  .post(
    "/passkey/verify/begin",
    async ({ body, upstream }) =>
      unwrap(await passkeyVerifyBegin(body, upstream)),
    { body: passkeyVerifyBeginBody },
  )

  .post(
    "/passkey/verify/finish",
    async ({ body, upstream }) =>
      unwrap(await passkeyVerifyFinish(body, upstream)),
    { body: passkeyVerifyFinishBody },
  )

  .post("/2fa/setup", async ({ upstream }) => unwrap(await setup2FA(upstream)))

  .post(
    "/2fa/enable",
    async ({ body, cookie, upstream }) => {
      const res = await enable2FA(body, upstream);
      await keepRotatedSession(cookie, res.data.data);
      return unwrap(res);
    },
    { body: twoFAEnableBody },
  )

  .post("/2fa/disable", async ({ cookie, upstream }) => {
    const res = await disable2FA(upstream);
    await keepRotatedSession(cookie, res.data.data);
    return unwrap(res);
  })

  .get("/passkey", async ({ upstream }) =>
    unwrap(await passkeyStatus(upstream)),
  )

  .post("/passkey/register/begin", async ({ upstream }) =>
    unwrap(await passkeyRegisterBegin(upstream)),
  )

  .post(
    "/passkey/register/finish",
    async ({ body, cookie, upstream }) => {
      const res = await passkeyRegisterFinish(body, upstream);
      await keepRotatedSession(cookie, res.data.data);
      return unwrap(res);
    },
    { body: passkeyRegisterFinishBody },
  )

  .delete("/passkey", async ({ cookie, upstream }) => {
    const res = await passkeyDelete(upstream);
    await keepRotatedSession(cookie, res.data.data);
    return unwrap(res);
  });
