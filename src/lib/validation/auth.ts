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

export const forgotPasswordSchema = t.Object({
  email: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  turnstile: t.Optional(t.String()),
});
export const forgotPasswordChecker = TypeCompiler.Compile(forgotPasswordSchema);
export type ForgotPasswordSchema = Static<typeof forgotPasswordSchema>;

export const registerSchema = t.Object({
  username: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  // Mirrors new-api's RegisterRequest tag. 72 is bcrypt's hard ceiling
  // (Password2Hash errors above it), and upstream reports a violation as a bare
  // "Invalid parameters" naming no field, so catch it before submit. NOT applied
  // to loginSchema: login has no upstream max, and capping it would lock out
  // anyone whose existing password is longer.
  password: t.String({
    minLength: 8,
    maxLength: 72,
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
