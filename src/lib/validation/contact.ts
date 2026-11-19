import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Type as t, type Static } from "@sinclair/typebox/type";
import { msg } from "../config/constants";

export const contactSchema = t.Object({
  name: t.String({ maxLength: 100, default: "" }),
  email: t.String({
    minLength: 3,
    maxLength: 254,
    default: "",
    error: msg("FORM.ERROR.REQUIRED"),
  }),
  subject: t.String({ maxLength: 200, default: "" }),
  message: t.String({
    minLength: 10,
    maxLength: 5000,
    default: "",
    error: msg("CONTACT.ERROR_MESSAGE_LENGTH"),
  }),
});
export const contactChecker = TypeCompiler.Compile(contactSchema);
export type ContactSchema = Static<typeof contactSchema>;
