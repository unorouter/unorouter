import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg } from "../config/constants";

export const changePasswordSchema = t.Object({
  original_password: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  password: t.String({
    minLength: 8,
    maxLength: 20,
    default: "",
    error: msg("FORM.ERROR.MIN_LENGTH"),
  }),
  confirm_password: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
});
export const changePasswordChecker = TypeCompiler.Compile(changePasswordSchema);
export type ChangePasswordSchema = Static<typeof changePasswordSchema>;

export const emailBindSchema = t.Object({
  email: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  verification_code: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
});
export const emailBindChecker = TypeCompiler.Compile(emailBindSchema);
export type EmailBindSchema = Static<typeof emailBindSchema>;

export const twoFACodeSchema = t.Object({
  code: t.String({
    minLength: 6,
    maxLength: 6,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
});
export const twoFACodeChecker = TypeCompiler.Compile(twoFACodeSchema);
export type TwoFACodeSchema = Static<typeof twoFACodeSchema>;

export const deleteAccountSchema = t.Object({
  username: t.String({
    minLength: 1,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
});
export const deleteAccountChecker = TypeCompiler.Compile(deleteAccountSchema);
export type DeleteAccountSchema = Static<typeof deleteAccountSchema>;

export const notificationSettingSchema = t.Object({
  notify_type: t.String({ default: "email" }),
  quota_threshold_dollars: t.Number({
    minimum: 0,
    default: 1,
    error: msg("FORM.ERROR.MIN_VALUE"),
  }),
  notification_email: t.String({ default: "" }),
  webhook_url: t.String({ default: "" }),
  webhook_secret: t.String({ default: "" }),
  bark_url: t.String({ default: "" }),
  gotify_url: t.String({ default: "" }),
  gotify_token: t.String({ default: "" }),
  gotify_priority: t.Number({ minimum: 0, maximum: 10, default: 5 }),
});
export const notificationSettingChecker = TypeCompiler.Compile(
  notificationSettingSchema,
);
export type NotificationSettingSchema = Static<
  typeof notificationSettingSchema
>;
