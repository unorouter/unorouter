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

/** Max characters of extracted PDF text to inline into a chat message. */
export const MAX_PDF_TEXT_CHARS = 200_000;

/** Max upload size per user request (100 MiB). */
export const MAX_USER_UPLOAD_BYTES = 100 * 1024 * 1024;
