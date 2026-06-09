import { t } from "elysia";

export const loginBody = t.Object({
  username: t.String(),
  password: t.String(),
  turnstile: t.Optional(t.String()),
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
  action: t.Optional(t.String()),
});

export const oauthCallbackQuery = t.Object({
  code: t.Optional(t.String()),
  error: t.Optional(t.String()),
});

export const oauthUnbindParams = t.Object({
  binding_type: t.Union([
    t.Literal("github"),
    t.Literal("discord"),
    t.Literal("oidc"),
    t.Literal("wechat"),
    t.Literal("telegram"),
    t.Literal("linuxdo"),
  ]),
});
