import { t } from "elysia";

export const loginBody = t.Object({
  username: t.String(),
  password: t.String(),
  turnstile: t.Optional(t.String()),
});

export const verify2FABody = t.Object({
  code: t.String(),
});

export const registerBody = t.Object({
  username: t.String(),
  password: t.String(),
  email: t.Optional(t.String()),
  verification_code: t.Optional(t.String()),
  aff_code: t.Optional(t.String()),
  turnstile: t.Optional(t.String()),
});

export const oauthStateQuery = t.Object({
  redirect: t.Optional(t.String()),
  aff: t.Optional(t.String()),
});

export const oauthTokenQuery = t.Object({
  access_token: t.String(),
});

export const verificationQuery = t.Object({
  email: t.String(),
  turnstile: t.Optional(t.String()),
});
