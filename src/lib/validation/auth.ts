import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg } from "../config/constants";

export const loginSchema = t.Object({
  username: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  password: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  turnstile: t.Optional(t.String()),
});
export const loginChecker = TypeCompiler.Compile(loginSchema);
export type LoginSchema = Static<typeof loginSchema>;

export const registerSchema = t.Object({
  username: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  password: t.String({
    minLength: 8,
    default: "",
    error: msg("FORM.ERROR.MIN_LENGTH"),
  }),
  email: t.Optional(t.String({ default: "" })),
  verification_code: t.Optional(t.String({ default: "" })),
  aff_code: t.Optional(t.String()),
  turnstile: t.Optional(t.String()),
});
export const registerChecker = TypeCompiler.Compile(registerSchema);
export type RegisterSchema = Static<typeof registerSchema>;

// Shape of the upstream new-api response at GET /oauth/v1/authorize/info.
// Matches the Gin handler in controller/oauth_consent.go (OAuthConsentInfo).
// Used by the consent page to render the auth request before the user
// approves it; treat as untrusted input until validated.
export const authRequestInfoSchema = t.Object({
  client_id: t.String(),
  scope: t.String(),
  redirect_uri: t.String(),
  state: t.String(),
});
export const authRequestInfoChecker = TypeCompiler.Compile(
  authRequestInfoSchema,
);
export type AuthRequestInfo = Static<typeof authRequestInfoSchema>;
