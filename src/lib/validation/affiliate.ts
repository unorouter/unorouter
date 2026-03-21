import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg } from "../config/constants";

export const transferSchema = t.Object({
  amount: t.Number({
    minimum: 0.01,
    default: 0,
    error: msg("FORM.ERROR.MIN_VALUE"),
  }),
});
export const transferChecker = TypeCompiler.Compile(transferSchema);
export type TransferSchema = Static<typeof transferSchema>;
