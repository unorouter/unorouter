import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg } from "../config/constants";

export const tokenFormSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: 50,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  remain_quota: t.Number({ default: 0 }),
  unlimited_quota: t.Boolean({ default: true }),
  model_limits_enabled: t.Boolean({ default: false }),
  model_limits: t.Array(t.String(), { default: [] }),
  allow_ips: t.String({ default: "" }),
});
export type TokenFormSchema = Static<typeof tokenFormSchema>;
