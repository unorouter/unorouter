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
  group_mapping: t.Record(
    t.String(),
    t.Object({
      groups: t.Array(t.String(), { default: [] }),
      min: t.Optional(t.Number({ minimum: 0 })),
      max: t.Optional(t.Number({ minimum: 0 })),
      auto: t.Optional(t.Boolean()),
    }),
    { default: {} },
  ),
});
export type TokenFormSchema = Static<typeof tokenFormSchema>;
export type TokenPinEntry = TokenFormSchema["group_mapping"][string];
