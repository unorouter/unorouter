import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Type as t, type Static } from "@sinclair/typebox/type";

export const imageGenResponseSchema = t.Object({
  data: t.Array(
    t.Object({
      url: t.Optional(t.String()),
      b64_json: t.Optional(t.String()),
    }),
  ),
});
export const imageGenResponseChecker = TypeCompiler.Compile(
  imageGenResponseSchema,
);
export type ImageGenResponse = Static<typeof imageGenResponseSchema>;
