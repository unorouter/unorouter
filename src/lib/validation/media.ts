import { TypeCompiler } from "@sinclair/typebox/compiler";
import { Type as t } from "@sinclair/typebox/type";

const imageGenResponseSchema = t.Object({
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
