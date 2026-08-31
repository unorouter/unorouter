import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg } from "../config/constants";

export const giftCardSchema = t.Object({
  name: t.String({
    minLength: 1,
    maxLength: 20,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  amount: t.Number({
    minimum: 0.01,
    default: 0,
    error: msg("FORM.ERROR.MIN_VALUE"),
  }),
});
export type GiftCardSchema = Static<typeof giftCardSchema>;

export const grantSchema = t.Object({
  user_id: t.Number({
    minimum: 1,
    default: 0,
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  amount: t.Number({
    minimum: 0.01,
    default: 0,
    error: msg("FORM.ERROR.MIN_VALUE"),
  }),
});
export type GrantSchema = Static<typeof grantSchema>;
