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
  // 72 is bcrypt's ceiling. NEVER add this cap to loginSchema: it locks out
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

// access_expires_at and expires_at are unix SECONDS.
// A challenge carries require_verification + flow_token + methods and NO
// access_token, so it must be branched on before the session-cookie write.
// data must admit null: gin marshals the error envelope as {"success":false,
// "message":"...","data":null}, and an Optional-only field rejects that body,
// which made handleAuthResponse return undefined and a wrong password "log in".
export const authResponseSchema = t.Object(
  {
    success: t.Optional(t.Boolean()),
    message: t.Optional(t.String()),
    data: t.Optional(
      t.Union([
        t.Null(),
        t.Object(
          {
            access_token: t.Optional(t.String()),
            access_expires_at: t.Optional(t.Number()),
            user: t.Optional(
              t.Object(
                { id: t.Optional(t.Union([t.String(), t.Number()])) },
                { additionalProperties: true },
              ),
            ),
            require_verification: t.Optional(t.Boolean()),
            flow_token: t.Optional(t.String()),
            expires_at: t.Optional(t.Number()),
            methods: t.Optional(
              t.Array(
                t.Object(
                  {
                    method: t.String(),
                    available: t.Boolean(),
                    reason: t.Optional(t.String()),
                  },
                  { additionalProperties: true },
                ),
              ),
            ),
          },
          { additionalProperties: true },
        ),
      ]),
    ),
  },
  { additionalProperties: true },
);
export const authResponseChecker = TypeCompiler.Compile(authResponseSchema);
export type AuthResponseData = Static<typeof authResponseSchema>;

// Upstream offers "2fa" and "passkey" for the login scope. Only "2fa" is
// implemented here; a passkey is refused by policy while passkey.enabled is off,
// so it never reaches a client as an available method.
export type VerificationMethod = {
  method: string;
  available: boolean;
  reason?: string;
};
export const VERIFICATION_METHOD_TWOFA = "2fa";
