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

export const twoFASchema = t.Object({
  code: t.String({
    minLength: 6,
    maxLength: 6,
    default: "",
    error: msg("FORM.ERROR.EXACT_LENGTH"),
  }),
});
export const twoFAChecker = TypeCompiler.Compile(twoFASchema);
export type TwoFASchema = Static<typeof twoFASchema>;
